import { describe, expect, it } from 'vitest'
import { CONFIG, type ItemDef } from '../config/evergrow.config'
import type { Cell, CellMap } from './cells'
import {
  EMPTY_HISTORY,
  apply,
  canRedo,
  canUndo,
  execute,
  redo,
  undo,
  validate,
  type Command,
  type WorldState,
} from './commands'
import { key } from './grid'
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
