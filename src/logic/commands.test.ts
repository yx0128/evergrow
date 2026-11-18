import { describe, expect, it } from 'vitest'
import { CONFIG, type ItemDef } from '../config/evergrow.config'
import type { Cell, CellMap } from './cells'
import {
  EMPTY_HISTORY,
  apply,
  canRedo,
  canUndo,
  execute,
  executeBatch,
  redo,
  undo,
  validate,
  type Command,
  type WorldState,
} from './commands'
import { key, worldBounds } from './grid'
import {
  buildOccupancy,
  type PlacedItem,
  type PlacedItems,
} from './placement'

const HALF_WORLD = CONFIG.world.maxSize / 2
const MAX = CONFIG.world.maxStack

const item = (overrides: Partial<ItemDef> & Pick<ItemDef, 'id' | 'footprint'>): ItemDef => ({
  name: overrides.id,
  category: 'test',
  price: 0,
  defaultTile: 'grass',
  allowedTiles: ['grass', 'land'],
  connectable: false,
  model: `assets/models/${overrides.id}.glb`,
  thumb: `assets/thumbs/${overrides.id}.png`,
  emissive: false,
  ...overrides,
})

const lamp = item({ id: 'lamp', footprint: [1, 1], price: 10, allowedTiles: ['grass'] })
const cottage = item({ id: 'cottage', footprint: [2, 2], price: 80 })
const fence = item({
  id: 'fence',
  footprint: [1, 1],
  price: 5,
  connectable: true,
})
const catalog = new Map<string, ItemDef>([
  [lamp.id, lamp],
  [cottage.id, cottage],
  [fence.id, fence],
])

const cell = (x: number, z: number, type: Cell['type'] = 'grass', level = 1): Cell => ({
  x,
  z,
  type,
  level,
})

const mapWith = (...cells: Cell[]): CellMap =>
  new Map(cells.map((it) => [key(it.x, it.z), it]))

const placed = (uid: string, def: ItemDef, x = 0, z = 0, rot: PlacedItem['rot'] = 0): PlacedItem => ({
  uid,
  id: def.id,
  x,
  z,
  rot,
})

const itemsOf = (...list: ReadonlyArray<PlacedItem>): PlacedItems =>
  new Map(list.map((it) => [it.uid, it]))

interface StateOptions {
  readonly cells?: CellMap
  readonly items?: PlacedItems
  readonly inventory?: ReadonlyMap<string, number>
  readonly coins?: number
}

const stateOf = (options: StateOptions = {}): WorldState => {
  const items = options.items ?? itemsOf()
  return {
    cells: options.cells ?? mapWith(),
    items,
    occupancy: buildOccupancy(items, catalog),
    inventory: options.inventory ?? new Map(),
    coins: options.coins ?? 0,
  }
}

const inventoryOf = (entries: ReadonlyArray<[string, number]>) => new Map(entries)

function worldCoords(count: number): Array<[number, number]> {
  // Paint needs each cell buildable: start inside the start zone at (0, 0) and
  // snake through z >= 0 so every next cell touches the already-painted path.
  const { minX, maxX, maxZ } = worldBounds()
  const coords: Array<[number, number]> = []
  for (let z = 0; z <= maxZ && coords.length < count; z += 1) {
    if (z === 0) {
      for (let x = 0; x <= maxX && coords.length < count; x += 1) coords.push([x, z])
    } else if (z % 2 === 1) {
      for (let x = maxX; x >= minX && coords.length < count; x -= 1) coords.push([x, z])
    } else {
      for (let x = minX; x <= maxX && coords.length < count; x += 1) coords.push([x, z])
    }
  }
  if (coords.length < count) {
    throw new Error(`World has only ${coords.length} buildable-path cells; need ${count}`)
  }
  return coords
}

function assertConsistent(state: WorldState): void {
  expect(state.occupancy).toEqual(buildOccupancy(state.items, catalog))
  for (const [cellKey, uid] of state.occupancy) {
    expect(state.items.has(uid)).toBe(true)
    expect(state.cells.has(cellKey)).toBe(true)
  }
}

function expectRoundTrip(initial: WorldState, command: Command): void {
  const executed = execute(EMPTY_HISTORY, initial, command, catalog)
  expect(executed.ok).toBe(true)
  if (!executed.ok) return
  assertConsistent(executed.state)

  const undone = undo(executed.history, executed.state, catalog)
  expect(undone.ok).toBe(true)
  if (!undone.ok) return
  expect(undone.state).toEqual(initial)
  assertConsistent(undone.state)

  const redone = redo(undone.history, undone.state, catalog)
  expect(redone.ok).toBe(true)
  if (!redone.ok) return
  expect(redone.state).toEqual(executed.state)
  assertConsistent(redone.state)
}

describe('place', () => {
  it('places from inventory, spends one item, and undoes the delta', () => {
    const initial = stateOf({ inventory: inventoryOf([['lamp', 1]]) })
    const command: Command = {
      kind: 'place',
      uid: 'a',
      id: 'lamp',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'inventory',
    }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.items.get('a')).toEqual(placed('a', lamp))
    expect(executed.state.cells.get(key(0, 0))).toEqual(cell(0, 0))
    expect(executed.state.inventory.has('lamp')).toBe(false)
    assertConsistent(executed.state)

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state.inventory.get('lamp')).toBe(1)
    expectRoundTrip(initial, command)
  })

  it('places from the shop, charges, and refunds on undo', () => {
    const initial = stateOf({ coins: 100 })
    const command: Command = {
      kind: 'place',
      uid: 'a',
      id: 'cottage',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'shop',
    }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.coins).toBe(20)
    expect(executed.state.cells.size).toBe(4)
    assertConsistent(executed.state)

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state.coins).toBe(100)
    expectRoundTrip(initial, command)
  })

  it('places a connectable fence at rot 1', () => {
    const initial = stateOf({ inventory: inventoryOf([['fence', 1]]) })
    const command: Command = {
      kind: 'place',
      uid: 'f',
      id: 'fence',
      x: 0,
      z: 0,
      rot: 1,
      autoTile: 'grass',
      source: 'inventory',
    }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.items.get('f')?.rot).toBe(1)
    expectRoundTrip(initial, command)
  })

  it('rejects an inventory item that is not owned', () => {
    const command: Command = {
      kind: 'place',
      uid: 'a',
      id: 'lamp',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'inventory',
    }
    expect(validate(command, stateOf(), catalog)).toEqual({
      ok: false,
      reason: 'notInInventory',
    })
  })

  it('rejects a shop item that costs more than the coins held', () => {
    const command: Command = {
      kind: 'place',
      uid: 'a',
      id: 'cottage',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'shop',
    }
    expect(validate(command, stateOf({ coins: 10 }), catalog)).toEqual({
      ok: false,
      reason: 'unaffordable',
    })
  })

  it('rejects an occupied footprint', () => {
    const other = placed('a', lamp)
    const state = stateOf({ cells: mapWith(cell(0, 0)), items: itemsOf(other) })
    const command: Command = {
      kind: 'place',
      uid: 'b',
      id: 'lamp',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'inventory',
    }
    expect(validate(command, state, catalog)).toEqual({ ok: false, reason: 'occupied' })
  })

  it('throws when the uid already exists', () => {
    const state = stateOf({ items: itemsOf(placed('a', lamp)) })
    const command: Command = {
      kind: 'place',
      uid: 'a',
      id: 'lamp',
      x: 4,
      z: 4,
      rot: 0,
      autoTile: 'grass',
      source: 'inventory',
    }
    expect(() => validate(command, state, catalog)).toThrow('Item uid already exists: a')
  })

  it('undo removes only the tiles the place command created', () => {
    const initial = stateOf({ cells: mapWith(cell(5, 5)), inventory: inventoryOf([['lamp', 1]]) })
    const command: Command = {
      kind: 'place',
      uid: 'a',
      id: 'lamp',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'inventory',
    }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)
    expect(executed.ok).toBe(true)
    if (!executed.ok) return

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state.cells).toEqual(initial.cells)
    expect(undone.state.cells.has(key(5, 5))).toBe(true)
  })
})

describe('move', () => {
  it('moves an item, keeps old tiles, creates tiles at the destination, and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    const command: Command = {
      kind: 'move',
      uid: 'a',
      x: 2,
      z: 2,
      rot: 0,
      autoTile: 'grass',
    }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.items.get('a')).toEqual(placed('a', lamp, 2, 2))
    expect(executed.state.cells.has(key(0, 0))).toBe(true)
    expect(executed.state.cells.has(key(2, 2))).toBe(true)
    assertConsistent(executed.state)
    expectRoundTrip(initial, command)
  })

  it('rejects a move onto another item', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0), cell(3, 3)),
      items: itemsOf(placed('a', lamp, 3, 3), placed('b', lamp)),
    })
    const command: Command = {
      kind: 'move',
      uid: 'a',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
    }
    expect(validate(command, state, catalog)).toEqual({ ok: false, reason: 'occupied' })
  })

  it('throws for an unknown uid', () => {
    const command: Command = {
      kind: 'move',
      uid: 'missing',
      x: 1,
      z: 1,
      rot: 0,
      autoTile: 'grass',
    }
    expect(() => validate(command, stateOf(), catalog)).toThrow('Unknown item uid: missing')
  })
})

describe('rotate', () => {
  it('changes only the rotation and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    const command: Command = { kind: 'rotate', uid: 'a' }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.items.get('a')?.rot).toBe(1)
    expect(executed.state.cells).toEqual(initial.cells)
    expectRoundTrip(initial, command)
  })

  it('rotates a connectable fence and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', fence)),
    })
    const command: Command = { kind: 'rotate', uid: 'a' }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.items.get('a')?.rot).toBe(1)
    expectRoundTrip(initial, command)
  })

  it('returns to the original rotation after four rotations', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    let state = initial
    let history = EMPTY_HISTORY
    for (let turn = 0; turn < 4; turn += 1) {
      const result = execute(history, state, { kind: 'rotate', uid: 'a' }, catalog)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      state = result.state
      history = result.history
      assertConsistent(state)
    }
    expect(state.items.get('a')?.rot).toBe(0)
    expect(state.cells).toEqual(initial.cells)
  })

  it('throws for an unknown uid', () => {
    expect(() => validate({ kind: 'rotate', uid: 'missing' }, stateOf(), catalog)).toThrow(
      'Unknown item uid: missing',
    )
  })
})

describe('store', () => {
  it('removes the item, keeps tiles, adds it to inventory, and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    const command: Command = { kind: 'store', uid: 'a' }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.items.has('a')).toBe(false)
    expect(executed.state.cells.has(key(0, 0))).toBe(true)
    expect(executed.state.inventory.get('lamp')).toBe(1)
    assertConsistent(executed.state)
    expectRoundTrip(initial, command)
  })

  it('blocks undo when the stored item has been used', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    const executed = execute(EMPTY_HISTORY, initial, { kind: 'store', uid: 'a' }, catalog)
    expect(executed.ok).toBe(true)
    if (!executed.ok) return

    const spent = { ...executed.state, inventory: new Map() }
    expect(undo(executed.history, spent, catalog)).toEqual({
      ok: false,
      reason: 'notInInventory',
      state: spent,
      history: executed.history,
    })
  })

  it('throws for an unknown uid', () => {
    expect(() => validate({ kind: 'store', uid: 'missing' }, stateOf(), catalog)).toThrow(
      'Unknown item uid: missing',
    )
  })
})

describe('sell', () => {
  it('refunds the full price, keeps tiles, and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    const command: Command = { kind: 'sell', uid: 'a' }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.coins).toBe(10)
    expect(executed.state.cells.has(key(0, 0))).toBe(true)
    assertConsistent(executed.state)
    expectRoundTrip(initial, command)
  })

  it('blocks undo when the coins were spent in between', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    const executed = execute(EMPTY_HISTORY, initial, { kind: 'sell', uid: 'a' }, catalog)
    expect(executed.ok).toBe(true)
    if (!executed.ok) return

    const spent = { ...executed.state, coins: 0 }
    expect(undo(executed.history, spent, catalog)).toEqual({
      ok: false,
      reason: 'unaffordable',
      state: spent,
      history: executed.history,
    })
  })

  it('throws for an unknown uid', () => {
    expect(() => validate({ kind: 'sell', uid: 'missing' }, stateOf(), catalog)).toThrow(
      'Unknown item uid: missing',
    )
  })
})

describe('paint', () => {
  it('paints a bare cell and round-trips', () => {
    const initial = stateOf()
    const command: Command = { kind: 'paint', x: 0, z: 0, type: 'land' }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.cells.get(key(0, 0))).toEqual(cell(0, 0, 'land'))
    expectRoundTrip(initial, command)
  })

  it('allows an item-approved type and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    const command: Command = { kind: 'paint', x: 0, z: 0, type: 'land' }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.cells.get(key(0, 0))?.type).toBe('land')
    expectRoundTrip(initial, command)
  })

  it('rejects a disallowed type under an item', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    expect(validate({ kind: 'paint', x: 0, z: 0, type: 'water' }, state, catalog)).toEqual({
      ok: false,
      reason: 'wrongTile',
    })
  })

  it('returns outsideWorld for invalid paint coordinates without throwing', () => {
    for (const [x, z] of [
      [1.5, 0],
      [NaN, 0],
    ]) {
      expect(() => execute(EMPTY_HISTORY, stateOf(), { kind: 'paint', x, z, type: 'grass' }, catalog)).not.toThrow()
      const result = execute(EMPTY_HISTORY, stateOf(), { kind: 'paint', x, z, type: 'grass' }, catalog)
      expect(result).toMatchObject({ ok: false, reason: 'outsideWorld' })
    }
    expect(
      validate({ kind: 'paint', x: HALF_WORLD, z: 0, type: 'grass' }, stateOf(), catalog),
    ).toEqual({ ok: false, reason: 'outsideWorld' })
  })

  it('returns the buildable-zone error for an in-world empty cell', () => {
    expect(validate({ kind: 'paint', x: 6, z: 0, type: 'grass' }, stateOf(), catalog)).toEqual({
      ok: false,
      reason: 'outsideBuildableZone',
    })
  })
})

describe('changeItemTile', () => {
  it('changes every footprint cell and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    const command: Command = { kind: 'changeItemTile', uid: 'a', type: 'land' }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    for (const value of executed.state.cells.values()) expect(value.type).toBe('land')
    expectRoundTrip(initial, command)
  })

  it('rejects a disallowed type', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    expect(
      validate({ kind: 'changeItemTile', uid: 'a', type: 'water' }, state, catalog),
    ).toEqual({ ok: false, reason: 'wrongTile' })
  })

  it('throws for an unknown uid', () => {
    expect(() =>
      validate({ kind: 'changeItemTile', uid: 'missing', type: 'land' }, stateOf(), catalog),
    ).toThrow('Unknown item uid: missing')
  })
})

describe('setLevel', () => {
  it('changes an uncovered cell and round-trips', () => {
    const initial = stateOf({ cells: mapWith(cell(0, 0)) })
    const command: Command = { kind: 'setLevel', x: 0, z: 0, level: 3 }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.cells.get(key(0, 0))?.level).toBe(3)
    expectRoundTrip(initial, command)
  })

  it('throws under the lamp', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    expect(() => validate({ kind: 'setLevel', x: 0, z: 0, level: 2 }, state, catalog)).toThrow(
      'Cell 0,0 is under item a; use setLevelItem',
    )
  })

  it('throws under the cottage', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    expect(() => validate({ kind: 'setLevel', x: 1, z: 1, level: 2 }, state, catalog)).toThrow(
      'Cell 1,1 is under item a; use setLevelItem',
    )
  })

  it('returns the level rule for an out-of-range level', () => {
    const state = stateOf({ cells: mapWith(cell(0, 0)) })
    expect(validate({ kind: 'setLevel', x: 0, z: 0, level: MAX + 1 }, state, catalog)).toEqual({
      ok: false,
      reason: 'maxStack',
    })
  })
})

describe('setLevelItem', () => {
  it('moves every footprint cell together and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    const command: Command = { kind: 'setLevelItem', uid: 'a', level: 4 }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    for (const value of executed.state.cells.values()) expect(value.level).toBe(4)
    expectRoundTrip(initial, command)
  })

  it('rejects an out-of-range level and changes nothing', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    const result = execute(EMPTY_HISTORY, state, { kind: 'setLevelItem', uid: 'a', level: 0 }, catalog)

    expect(result).toEqual({
      ok: false,
      reason: 'minStack',
      state,
      history: EMPTY_HISTORY,
    })
  })

  it('throws for an unknown uid', () => {
    expect(() =>
      validate({ kind: 'setLevelItem', uid: 'missing', level: 2 }, stateOf(), catalog),
    ).toThrow('Unknown item uid: missing')
  })
})

describe('digUp', () => {
  it('removes one level and round-trips', () => {
    const initial = stateOf({ cells: mapWith(cell(0, 0, 'grass', 3)) })
    const command: Command = { kind: 'digUp', x: 0, z: 0 }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.cells.get(key(0, 0))?.level).toBe(2)
    expectRoundTrip(initial, command)
  })

  it('removes a level-1 cell and round-trips', () => {
    const initial = stateOf({ cells: mapWith(cell(0, 0)) })
    const command: Command = { kind: 'digUp', x: 0, z: 0 }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.cells.has(key(0, 0))).toBe(false)
    expectRoundTrip(initial, command)
  })

  it('rejects digging under an item', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    expect(validate({ kind: 'digUp', x: 0, z: 0 }, state, catalog)).toEqual({
      ok: false,
      reason: 'underItem',
    })
  })

  it('returns outsideWorld for invalid digUp coordinates without throwing', () => {
    for (const [x, z] of [
      [1.5, 0],
      [NaN, 0],
    ]) {
      expect(() => execute(EMPTY_HISTORY, stateOf(), { kind: 'digUp', x, z }, catalog)).not.toThrow()
      const result = execute(EMPTY_HISTORY, stateOf(), { kind: 'digUp', x, z }, catalog)
      expect(result).toMatchObject({ ok: false, reason: 'outsideWorld' })
    }
    expect(validate({ kind: 'digUp', x: HALF_WORLD, z: 0 }, stateOf(), catalog)).toEqual({
      ok: false,
      reason: 'outsideWorld',
    })
  })
})

describe('history', () => {
  const placeLamp: Command = {
    kind: 'place',
    uid: 'a',
    id: 'lamp',
    x: 0,
    z: 0,
    rot: 0,
    autoTile: 'grass',
    source: 'inventory',
  }

  it('tracks canUndo and canRedo and clears future on execute', () => {
    const initial = stateOf({ inventory: inventoryOf([['lamp', 1]]) })
    expect(canUndo(EMPTY_HISTORY)).toBe(false)
    expect(canRedo(EMPTY_HISTORY)).toBe(false)

    const first = execute(EMPTY_HISTORY, initial, placeLamp, catalog)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(canUndo(first.history)).toBe(true)
    expect(canRedo(first.history)).toBe(false)

    const undone = undo(first.history, first.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(canUndo(undone.history)).toBe(false)
    expect(canRedo(undone.history)).toBe(true)

    const second = execute(undone.history, undone.state, { kind: 'paint', x: 4, z: 4, type: 'grass' }, catalog)
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(canUndo(second.history)).toBe(true)
    expect(canRedo(second.history)).toBe(false)
  })

  it('leaves state and history unchanged when execute fails', () => {
    const state = stateOf({ cells: mapWith(cell(0, 0)), items: itemsOf(placed('a', lamp)) })
    const command: Command = {
      kind: 'place',
      uid: 'b',
      id: 'lamp',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'inventory',
    }
    const result = execute(EMPTY_HISTORY, state, command, catalog)

    expect(result).toEqual({
      ok: false,
      reason: 'occupied',
      state,
      history: EMPTY_HISTORY,
    })
  })

  it('throws when there is nothing to undo or redo', () => {
    expect(() => undo(EMPTY_HISTORY, stateOf(), catalog)).toThrow('Nothing to undo')
    expect(() => redo(EMPTY_HISTORY, stateOf(), catalog)).toThrow('Nothing to redo')
  })

  it('re-validates redo after an outside coin change', () => {
    const initial = stateOf({ coins: 100 })
    const command: Command = {
      kind: 'place',
      uid: 'a',
      id: 'cottage',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'shop',
    }
    const executed = execute(EMPTY_HISTORY, initial, command, catalog)
    expect(executed.ok).toBe(true)
    if (!executed.ok) return

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return

    const spent = { ...undone.state, coins: 0 }
    expect(redo(undone.history, spent, catalog)).toEqual({
      ok: false,
      reason: 'unaffordable',
      state: spent,
      history: undone.history,
    })
  })
})

describe('apply guards', () => {
  it('throws when placement was not validated first', () => {
    const state = stateOf({ cells: mapWith(cell(0, 0)), items: itemsOf(placed('a', lamp)) })
    const command: Command = {
      kind: 'place',
      uid: 'b',
      id: 'lamp',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'inventory',
    }
    expect(() => apply(command, state, catalog)).toThrow('Invalid placement: occupied')
  })

  it('throws when the item level was not validated first', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
      items: itemsOf(placed('a', cottage)),
    })
    expect(() => apply({ kind: 'setLevelItem', uid: 'a', level: 0 }, state, catalog)).toThrow(
      'Unexpected cell result: minStack',
    )
  })
})

describe('history limit', () => {
  it('keeps the newest limit entries, drops the oldest, and undoes the kept ones', () => {
    const limit = CONFIG.history.limit
    const coords = worldCoords(limit + 1)

    let state = stateOf()
    let history = EMPTY_HISTORY
    for (const [x, z] of coords) {
      const result = execute(history, state, { kind: 'paint', x, z, type: 'grass' }, catalog)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      state = result.state
      history = result.history
      assertConsistent(state)
    }

    expect(history.past).toHaveLength(limit)
    for (let count = 0; count < limit; count += 1) {
      const undone = undo(history, state, catalog)
      expect(undone.ok).toBe(true)
      if (!undone.ok) return
      state = undone.state
      history = undone.history
      assertConsistent(state)
    }

    expect(canUndo(history)).toBe(false)
    expect(state.cells.size).toBe(1)
    expect(state.cells.has(key(coords[0][0], coords[0][1]))).toBe(true)
  })
})

describe('executeBatch', () => {
  const paintCommands: Command[] = [
    { kind: 'paint', x: 0, z: 0, type: 'grass' },
    { kind: 'paint', x: 1, z: 0, type: 'grass' },
    { kind: 'paint', x: 0, z: 1, type: 'grass' },
  ]

  it('applies a stroke as one history entry and round-trips', () => {
    const initial = stateOf()
    const result = executeBatch(EMPTY_HISTORY, initial, paintCommands, catalog)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.skipped).toEqual([])
    expect(result.history.past).toHaveLength(1)
    expect(result.state.cells.size).toBe(3)
    assertConsistent(result.state)

    const undone = undo(result.history, result.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state).toEqual(initial)
    assertConsistent(undone.state)

    const redone = redo(undone.history, undone.state, catalog)
    expect(redone.ok).toBe(true)
    if (!redone.ok) return
    expect(redone.state).toEqual(result.state)
    assertConsistent(redone.state)
  })

  it('skips a failing cell and records only the applied commands', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    const commands: Command[] = [
      { kind: 'paint', x: 2, z: 2, type: 'grass' },
      { kind: 'digUp', x: 0, z: 0 },
      { kind: 'paint', x: 3, z: 3, type: 'grass' },
    ]
    const result = executeBatch(EMPTY_HISTORY, initial, commands, catalog)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.skipped).toEqual([{ index: 1, reason: 'underItem' }])
    expect(result.history.past).toHaveLength(1)
    expect(result.state.cells.has(key(2, 2))).toBe(true)
    expect(result.state.cells.has(key(3, 3))).toBe(true)
    expect(result.state.cells.get(key(0, 0))?.level).toBe(1)
    assertConsistent(result.state)

    const undone = undo(result.history, result.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state).toEqual(initial)

    const redone = redo(undone.history, undone.state, catalog)
    expect(redone.ok).toBe(true)
    if (!redone.ok) return
    expect(redone.state).toEqual(result.state)
  })

  it('fails with the first reason when every sub-command fails', () => {
    const state = stateOf({
      cells: mapWith(cell(0, 0)),
      items: itemsOf(placed('a', lamp)),
    })
    const commands: Command[] = [
      { kind: 'digUp', x: 0, z: 0 },
      { kind: 'paint', x: 0, z: 0, type: 'water' },
    ]
    expect(executeBatch(EMPTY_HISTORY, state, commands, catalog)).toEqual({
      ok: false,
      reason: 'underItem',
      state,
      history: EMPTY_HISTORY,
      skipped: [
        { index: 0, reason: 'underItem' },
        { index: 1, reason: 'wrongTile' },
      ],
    })
  })

  it('re-validates every sub-command on redo and changes nothing on failure', () => {
    const initial = stateOf()
    const commands: Command[] = [
      { kind: 'paint', x: 0, z: 0, type: 'water' },
      { kind: 'paint', x: 1, z: 1, type: 'water' },
    ]
    const executed = executeBatch(EMPTY_HISTORY, initial, commands, catalog)
    expect(executed.ok).toBe(true)
    if (!executed.ok) return

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return

    const changed = stateOf({
      cells: mapWith(cell(1, 1)),
      items: itemsOf(placed('a', lamp, 1, 1)),
    })
    expect(redo(undone.history, changed, catalog)).toEqual({
      ok: false,
      reason: 'wrongTile',
      state: changed,
      history: undone.history,
    })
  })

  it('sums inventory deltas across a batch', () => {
    const initial = stateOf({ inventory: inventoryOf([['lamp', 2]]) })
    const commands: Command[] = [
      {
        kind: 'place',
        uid: 'a',
        id: 'lamp',
        x: 0,
        z: 0,
        rot: 0,
        autoTile: 'grass',
        source: 'inventory',
      },
      {
        kind: 'place',
        uid: 'b',
        id: 'lamp',
        x: 2,
        z: 2,
        rot: 1,
        autoTile: 'grass',
        source: 'inventory',
      },
    ]
    const executed = executeBatch(EMPTY_HISTORY, initial, commands, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.inventory.has('lamp')).toBe(false)
    expect(executed.state.items.size).toBe(2)
    assertConsistent(executed.state)

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state).toEqual(initial)
    expect(undone.state.inventory.get('lamp')).toBe(2)

    const redone = redo(undone.history, undone.state, catalog)
    expect(redone.ok).toBe(true)
    if (!redone.ok) return
    expect(redone.state).toEqual(executed.state)
  })

  it('caps past at the limit and keeps the newest batch entry', () => {
    const limit = CONFIG.history.limit
    const coords = worldCoords(limit + 1)
    let state = stateOf()
    let history = EMPTY_HISTORY
    for (let index = 0; index < limit; index += 1) {
      const [x, z] = coords[index]
      const result = execute(history, state, { kind: 'paint', x, z, type: 'grass' }, catalog)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      state = result.state
      history = result.history
    }

    const [batchX, batchZ] = coords[limit]
    const result = executeBatch(
      history,
      state,
      [{ kind: 'paint', x: batchX, z: batchZ, type: 'grass' }],
      catalog,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.history.past).toHaveLength(limit)
    expect(result.history.future).toEqual([])
    expect(result.history.past[result.history.past.length - 1].command).toMatchObject({
      kind: 'batch',
    })
    expect(result.history.past[0].command).toEqual({
      kind: 'paint',
      x: coords[1][0],
      z: coords[1][1],
      type: 'grass',
    })
  })

  it('sums coin deltas from sells and round-trips', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 1)),
      items: itemsOf(placed('a', lamp), placed('b', lamp, 1, 1)),
      coins: 5,
    })
    const commands: Command[] = [
      { kind: 'sell', uid: 'a' },
      { kind: 'sell', uid: 'b' },
    ]
    const executed = executeBatch(EMPTY_HISTORY, initial, commands, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.coins).toBe(initial.coins + 2 * lamp.price)
    expect(executed.history.past).toHaveLength(1)

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state).toEqual(initial)

    const redone = redo(undone.history, undone.state, catalog)
    expect(redone.ok).toBe(true)
    if (!redone.ok) return
    expect(redone.state).toEqual(executed.state)

    const undoneAgain = undo(redone.history, redone.state, catalog)
    expect(undoneAgain.ok).toBe(true)
    if (!undoneAgain.ok) return
    expect(undoneAgain.state).toEqual(initial)
  })

  it('blocks undo of a batch of sells when the coins were spent', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 1)),
      items: itemsOf(placed('a', lamp), placed('b', lamp, 1, 1)),
      coins: 5,
    })
    const executed = executeBatch(
      EMPTY_HISTORY,
      initial,
      [
        { kind: 'sell', uid: 'a' },
        { kind: 'sell', uid: 'b' },
      ],
      catalog,
    )
    expect(executed.ok).toBe(true)
    if (!executed.ok) return

    const spent = stateOf({
      cells: executed.state.cells,
      items: executed.state.items,
      inventory: executed.state.inventory,
      coins: 0,
    })
    expect(undo(executed.history, spent, catalog)).toEqual({
      ok: false,
      reason: 'unaffordable',
      state: spent,
      history: executed.history,
    })
  })

  it('clears future on a successful stroke and keeps it on an all-fail stroke', () => {
    const executed = execute(EMPTY_HISTORY, stateOf(), { kind: 'paint', x: 0, z: 0, type: 'grass' }, catalog)
    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(canRedo(undone.history)).toBe(true)

    const allFail = executeBatch(
      undone.history,
      undone.state,
      [{ kind: 'digUp', x: HALF_WORLD, z: 0 }],
      catalog,
    )
    expect(allFail.ok).toBe(false)
    expect(allFail.history).toEqual(undone.history)
    expect(canRedo(allFail.history)).toBe(true)

    const stroke = executeBatch(
      undone.history,
      undone.state,
      paintCommands,
      catalog,
    )
    expect(stroke.ok).toBe(true)
    if (!stroke.ok) return
    expect(canRedo(stroke.history)).toBe(false)
  })

  it('applies dependent paint, sell and place commands in one stroke', () => {
    const initial = stateOf({
      cells: mapWith(cell(1, 1)),
      items: itemsOf(placed('a', lamp, 1, 1)),
      coins: 0,
    })
    const commands: Command[] = [
      { kind: 'paint', x: 2, z: 2, type: 'grass' },
      { kind: 'sell', uid: 'a' },
      {
        kind: 'place',
        uid: 'f',
        id: 'fence',
        x: 2,
        z: 2,
        rot: 0,
        autoTile: 'grass',
        source: 'shop',
      },
    ]
    const executed = executeBatch(EMPTY_HISTORY, initial, commands, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.history.past).toHaveLength(1)
    expect(executed.state.items.has('f')).toBe(true)
    expect(executed.state.items.has('a')).toBe(false)
    expect(executed.state.cells.get(key(2, 2))?.type).toBe('grass')
    assertConsistent(executed.state)

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state).toEqual(initial)

    const redone = redo(undone.history, undone.state, catalog)
    expect(redone.ok).toBe(true)
    if (!redone.ok) return
    expect(redone.state).toEqual(executed.state)
  })

  it('applies both paints when the same cell is painted twice', () => {
    const executed = executeBatch(
      EMPTY_HISTORY,
      stateOf(),
      [
        { kind: 'paint', x: 0, z: 0, type: 'grass' },
        { kind: 'paint', x: 0, z: 0, type: 'water' },
      ],
      catalog,
    )

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.skipped).toEqual([])
    expect(executed.state.cells.get(key(0, 0))?.type).toBe('water')
  })

  it('never retries a skipped command that a later command would enable', () => {
    const initial = stateOf({
      cells: mapWith(cell(1, 1)),
      items: itemsOf(placed('a', lamp, 1, 1)),
      coins: 0,
    })
    const commands: Command[] = [
      {
        kind: 'place',
        uid: 'f',
        id: 'fence',
        x: 0,
        z: 0,
        rot: 0,
        autoTile: 'grass',
        source: 'shop',
      },
      { kind: 'sell', uid: 'a' },
    ]
    const executed = executeBatch(EMPTY_HISTORY, initial, commands, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.skipped).toEqual([{ index: 0, reason: 'unaffordable' }])
    expect(executed.state.items.has('f')).toBe(false)
    expect(executed.state.coins).toBe(initial.coins + lamp.price)
  })

  it('keeps inventory exact after placing and storing the same uid', () => {
    const initial = stateOf({ inventory: inventoryOf([['lamp', 1]]) })
    const commands: Command[] = [
      {
        kind: 'place',
        uid: 'a',
        id: 'lamp',
        x: 0,
        z: 0,
        rot: 0,
        autoTile: 'grass',
        source: 'inventory',
      },
      { kind: 'store', uid: 'a' },
    ]
    const executed = executeBatch(EMPTY_HISTORY, initial, commands, catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.inventory.get('lamp')).toBe(1)
    expect([...executed.state.inventory.values()].every((count) => count > 0)).toBe(true)
    expect(executed.state.items.size).toBe(0)

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state).toEqual(initial)
  })

  it('applies a sell refund as a delta after outside coin changes', () => {
    const initial = stateOf({
      cells: mapWith(cell(0, 0), cell(1, 1)),
      items: itemsOf(placed('a', lamp), placed('b', lamp, 1, 1)),
      coins: 5,
    })
    const executed = executeBatch(
      EMPTY_HISTORY,
      initial,
      [
        { kind: 'sell', uid: 'a' },
        { kind: 'sell', uid: 'b' },
      ],
      catalog,
    )
    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.state.coins).toBe(initial.coins + 2 * lamp.price)

    const external = stateOf({
      cells: executed.state.cells,
      items: executed.state.items,
      inventory: executed.state.inventory,
      coins: 100,
    })
    const undone = undo(executed.history, external, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state.coins).toBe(external.coins - 2 * lamp.price)
  })

  it('throws for a duplicate uid inside a batch', () => {
    const initial = stateOf({ coins: lamp.price * 3 })
    const command = (x: number): Command => ({
      kind: 'place',
      uid: 'a',
      id: 'lamp',
      x,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'shop',
    })
    expect(() =>
      executeBatch(EMPTY_HISTORY, initial, [command(0), command(1)], catalog),
    ).toThrow('Item uid already exists: a')
  })

  it('skips a second place on an occupied cell', () => {
    const initial = stateOf({ coins: lamp.price * 3 })
    const command = (uid: string): Command => ({
      kind: 'place',
      uid,
      id: 'lamp',
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'grass',
      source: 'shop',
    })
    const executed = executeBatch(EMPTY_HISTORY, initial, [command('a'), command('b')], catalog)

    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.skipped).toEqual([{ index: 1, reason: 'occupied' }])
    expect(executed.history.past).toHaveLength(1)
    expect(executed.state.items.size).toBe(1)
  })

  it('round-trips a single-command batch', () => {
    const initial = stateOf()
    const executed = executeBatch(
      EMPTY_HISTORY,
      initial,
      [{ kind: 'paint', x: 0, z: 0, type: 'grass' }],
      catalog,
    )
    expect(executed.ok).toBe(true)
    if (!executed.ok) return
    expect(executed.history.past).toHaveLength(1)

    const undone = undo(executed.history, executed.state, catalog)
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(undone.state).toEqual(initial)

    const redone = redo(undone.history, undone.state, catalog)
    expect(redone.ok).toBe(true)
    if (!redone.ok) return
    expect(redone.state).toEqual(executed.state)
  })

  it('throws for nested and empty batches', () => {
    const state = stateOf()
    expect(() =>
      executeBatch(
        EMPTY_HISTORY,
        state,
        [{ kind: 'batch', commands: [{ kind: 'paint', x: 0, z: 0, type: 'grass' }] }],
        catalog,
      ),
    ).toThrow('Nested batches are not allowed')
    expect(() => executeBatch(EMPTY_HISTORY, state, [], catalog)).toThrow(
      'An empty batch is not allowed',
    )
  })

  it('throws when a batch reaches execute or apply directly', () => {
    const state = stateOf()
    const batch: Command = { kind: 'batch', commands: [] }
    expect(() => execute(EMPTY_HISTORY, state, batch, catalog)).toThrow(
      'Batch commands must be executed with executeBatch',
    )
    expect(() => apply(batch, state, catalog)).toThrow(
      'Batch commands must be executed with executeBatch',
    )
  })
})

describe('command behaviour gaps', () => {
  const paintAt = (x: number, z: number): Command => ({ kind: 'paint', x, z, type: 'grass' })
  const placeLamp = (source: 'inventory' | 'shop'): Command => ({
    kind: 'place',
    uid: 'new',
    id: lamp.id,
    x: 0,
    z: 0,
    rot: 0,
    autoTile: 'grass',
    source,
  })

  function succeed<T extends { readonly ok: boolean }>(result: T): Extract<T, { ok: true }> {
    expect(result.ok).toBe(true)
    return result as Extract<T, { ok: true }>
  }

  const run = (state: WorldState, command: Command, history = EMPTY_HISTORY) =>
    succeed(execute(history, state, command, catalog))

  it('writes the requested auto tile into the world', () => {
    const result = run(stateOf({ coins: cottage.price }), {
      kind: 'place',
      uid: 'new',
      id: cottage.id,
      x: 0,
      z: 0,
      rot: 0,
      autoTile: 'land',
      source: 'shop',
    })
    expect([...result.state.cells.values()].map((it) => it.type)).toEqual([
      'land',
      'land',
      'land',
      'land',
    ])
  })

  it('buys with the exact price and refuses one coin short', () => {
    expect(run(stateOf({ coins: lamp.price }), placeLamp('shop')).state.coins).toBe(0)
    expect(validate(placeLamp('shop'), stateOf({ coins: lamp.price - 1 }), catalog)).toEqual({
      ok: false,
      reason: 'unaffordable',
    })
  })

  it('does not charge coins for an inventory place', () => {
    const state = stateOf({ coins: 100, inventory: inventoryOf([[lamp.id, 1]]) })
    expect(run(state, placeLamp('inventory')).state.coins).toBe(100)
  })

  it('does not spend inventory for a shop place', () => {
    const state = stateOf({ coins: 100, inventory: inventoryOf([[lamp.id, 2]]) })
    expect(run(state, placeLamp('shop')).state.inventory.get(lamp.id)).toBe(2)
  })

  it('lets a move overlap the item\'s own cells', () => {
    const state = stateOf({
      items: itemsOf(placed('c', cottage)),
      cells: mapWith(cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)),
    })
    const result = run(state, { kind: 'move', uid: 'c', x: 1, z: 0, rot: 0, autoTile: 'grass' })
    expect(result.state.items.get('c')).toMatchObject({ x: 1, z: 0 })
  })

  it('applies the requested rotation on move', () => {
    const state = stateOf({ items: itemsOf(placed('l', lamp)), cells: mapWith(cell(0, 0)) })
    const result = run(state, { kind: 'move', uid: 'l', x: 0, z: 0, rot: 2, autoTile: 'grass' })
    expect(result.state.items.get('l')?.rot).toBe(2)
  })

  it('throws when validate receives a batch', () => {
    const batch: Command = { kind: 'batch', commands: [paintAt(0, 0)] }
    expect(() => validate(batch, stateOf(), catalog)).toThrow(
      'Batch commands must be executed with executeBatch',
    )
  })

  it('keeps an existing history when execute fails', () => {
    const first = run(stateOf(), paintAt(0, 0))
    const failed = execute(first.history, first.state, paintAt(HALF_WORLD, HALF_WORLD), catalog)
    expect(failed.ok).toBe(false)
    expect(failed.history).toBe(first.history)
  })

  it('undoes the newest command first', () => {
    const first = run(stateOf(), paintAt(0, 0))
    const second = run(first.state, paintAt(1, 0), first.history)
    expect(succeed(undo(second.history, second.state, catalog)).state).toEqual(first.state)
  })

  it('replays two undone commands in their original order', () => {
    const first = run(stateOf(), paintAt(0, 0))
    const second = run(first.state, paintAt(1, 0), first.history)
    const undoOne = succeed(undo(second.history, second.state, catalog))
    const undoTwo = succeed(undo(undoOne.history, undoOne.state, catalog))
    const redoOne = succeed(redo(undoTwo.history, undoTwo.state, catalog))
    expect(redoOne.state).toEqual(first.state)
    const redoTwo = succeed(redo(redoOne.history, redoOne.state, catalog))
    expect(redoTwo.state).toEqual(second.state)
    expect(canRedo(redoTwo.history)).toBe(false)
  })

  it('replays two undone batches in their original order', () => {
    const first = succeed(executeBatch(EMPTY_HISTORY, stateOf(), [paintAt(0, 0)], catalog))
    const second = succeed(executeBatch(first.history, first.state, [paintAt(1, 0)], catalog))
    const undoOne = succeed(undo(second.history, second.state, catalog))
    const undoTwo = succeed(undo(undoOne.history, undoOne.state, catalog))
    const redoOne = succeed(redo(undoTwo.history, undoTwo.state, catalog))
    expect(redoOne.state).toEqual(first.state)
    const redoTwo = succeed(redo(redoOne.history, redoOne.state, catalog))
    expect(redoTwo.state).toEqual(second.state)
    expect(canRedo(redoTwo.history)).toBe(false)
  })

  it('records a fresh inverse when redo runs on a changed world', () => {
    const done = run(stateOf(), paintAt(0, 0))
    const undone = succeed(undo(done.history, done.state, catalog))
    const changed = { ...undone.state, cells: mapWith(cell(3, 3)) }
    const redone = succeed(redo(undone.history, changed, catalog))
    expect(succeed(undo(redone.history, redone.state, catalog)).state.cells).toEqual(changed.cells)
  })

  it('records a fresh inverse when batch redo runs on a changed world', () => {
    const done = succeed(executeBatch(EMPTY_HISTORY, stateOf(), [paintAt(0, 0)], catalog))
    const undone = succeed(undo(done.history, done.state, catalog))
    const changed = { ...undone.state, cells: mapWith(cell(3, 3)) }
    const redone = succeed(redo(undone.history, changed, catalog))
    expect(succeed(undo(redone.history, redone.state, catalog)).state.cells).toEqual(changed.cells)
  })
})
