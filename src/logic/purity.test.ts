import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import { digUp, paint, setCell, setLevel, setType } from './cells'
import type { CellMap } from './cells'
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
import { affectedByChange, getConnectionMask } from './connect'
import { getFootprintCells, rotatedSize } from './footprint'
import { isBuildable, landBounds, key } from './grid'
import {
  buildOccupancy,
  getLevelRange,
  itemAt,
  validatePlacement,
  type PlacedItems,
} from './placement'
import { catalogOf, item } from './testing/fixtures'

const MAX = CONFIG.world.maxStack

const base = (): CellMap =>
  new Map([
    [key(0, 0), { x: 0, z: 0, type: 'grass' as const, level: 3 }],
    [key(1, 0), { x: 1, z: 0, type: 'land' as const, level: 1 }],
    [key(0, 1), { x: 0, z: 1, type: 'water' as const, level: MAX }],
  ])

function expectPure(run: (cells: CellMap) => unknown): void {
  const cells = base()
  const size = cells.size
  const before = structuredClone([...cells])

  run(cells)

  expect([...cells]).toEqual(before)
  expect(cells.size).toBe(size)
}

function expectDeepPure<T>(make: () => T, run: (value: T) => unknown): void {
  const value = make()
  const before = structuredClone(value)

  run(value)

  expect(value).toEqual(before)
}

const cottage = item({ id: 'cottage', footprint: [2, 2] })
const lamp = item({ id: 'lamp', footprint: [1, 1] })
const catalog = catalogOf(cottage, lamp)
const items: PlacedItems = new Map([
  ['a', { uid: 'a', id: 'cottage', x: 0, z: 0, rot: 0 }],
  ['b', { uid: 'b', id: 'lamp', x: 5, z: 5, rot: 0 }],
])

function placement() {
  const cells = base()
  const occupancy = buildOccupancy(items, catalog)
  return { cells, occupancy, items, catalog }
}

function worldOf() {
  const cells = base()
  const state: WorldState = {
    cells,
    items,
    occupancy: buildOccupancy(items, catalog),
    inventory: new Map([['lamp', 1]]),
    coins: 100,
  }
  return { state, catalog }
}

const placeLamp: Command = {
  kind: 'place',
  uid: 'c',
  id: 'lamp',
  x: 3,
  z: 3,
  rot: 0,
  autoTile: 'grass',
  source: 'shop',
}

function historyFixture() {
  const world = worldOf()
  const executed = execute(EMPTY_HISTORY, world.state, placeLamp, world.catalog)
  if (!executed.ok) throw new Error(executed.reason)
  return { history: executed.history, state: executed.state, catalog: world.catalog }
}

function redoFixture() {
  const fixture = historyFixture()
  const undone = undo(fixture.history, fixture.state, fixture.catalog)
  if (!undone.ok) throw new Error(undone.reason)
  return { history: undone.history, state: undone.state, catalog: fixture.catalog }
}

const stroke: Command[] = [
  { kind: 'paint', x: 2, z: 2, type: 'grass' },
  { kind: 'paint', x: 2, z: 3, type: 'grass' },
]

function batchFixture() {
  const world = worldOf()
  const executed = executeBatch(EMPTY_HISTORY, world.state, stroke, world.catalog)
  if (!executed.ok) throw new Error(executed.reason)
  return { history: executed.history, state: executed.state, catalog: world.catalog }
}

function batchUndoFixture() {
  const fixture = batchFixture()
  const undone = undo(fixture.history, fixture.state, fixture.catalog)
  if (!undone.ok) throw new Error(undone.reason)
  return { history: undone.history, state: undone.state, catalog: fixture.catalog }
}

describe('logic purity', () => {
  it('setCell does not mutate the input', () => {
    expectPure((cells) => setCell(cells, { x: 5, z: 5, type: 'grass', level: 1 }))
  })

  it('setCell rejected level does not mutate the input', () => {
    expectPure((cells) => setCell(cells, { x: 5, z: 5, type: 'grass', level: 0 }))
  })

  it('setLevel does not mutate the input', () => {
    expectPure((cells) => setLevel(cells, 0, 0, 4))
  })

  it('a rejected setLevel does not mutate the input', () => {
    expectPure((cells) => setLevel(cells, 0, 0, MAX + 1))
  })

  it('setType does not mutate the input', () => {
    expectPure((cells) => setType(cells, 0, 0, 'water'))
  })

  it('paint on an existing cell does not mutate the input', () => {
    expectPure((cells) => paint(cells, 0, 0, 'land'))
  })

  it('paint on an empty cell does not mutate the input', () => {
    expectPure((cells) => paint(cells, 2, 2, 'grass'))
  })

  it('digUp above level 1 does not mutate the input', () => {
    expectPure((cells) => digUp(cells, 0, 0))
  })

  it('digUp at level 1 does not mutate the input', () => {
    expectPure((cells) => digUp(cells, 1, 0))
  })

  it('isBuildable does not mutate the input', () => {
    expectPure((cells) => isBuildable(2, 2, cells))
  })

  it('landBounds does not mutate the input', () => {
    expectPure((cells) => landBounds(cells))
  })

  it('getLevelRange does not mutate the input', () => {
    expectPure((cells) =>
      getLevelRange(0, 0, { cells, occupancy: new Map(), items: new Map() }, catalog),
    )
  })

  it('getLevelRange with item metadata does not mutate the input', () => {
    expectDeepPure(placement, (value) =>
      getLevelRange(
        0,
        0,
        { cells: value.cells, occupancy: value.occupancy, items: value.items },
        value.catalog,
      ),
    )
  })

  it('rotatedSize and getFootprintCells do not mutate the item', () => {
    expectDeepPure(
      () => cottage,
      (value) => {
        rotatedSize(value, 1)
        getFootprintCells(value, 2, -1, 3)
      },
    )
  })

  it('buildOccupancy does not mutate the items or catalog', () => {
    expectDeepPure(
      () => ({ items, catalog }),
      (value) => buildOccupancy(value.items, value.catalog),
    )
  })

  it('itemAt does not mutate the occupancy or items', () => {
    expectDeepPure(placement, (value) => itemAt(0, 0, value.occupancy, value.items))
  })

  it('validatePlacement does not mutate the item or state', () => {
    expectDeepPure(placement, (value) =>
      validatePlacement(
        cottage,
        0,
        0,
        0,
        'grass',
        { cells: value.cells, occupancy: value.occupancy },
        'a',
      ),
    )
  })

  it('getConnectionMask does not mutate the items or occupancy', () => {
    expectDeepPure(placement, (value) =>
      getConnectionMask('a', value.items, value.occupancy, value.catalog),
    )
  })

  it('affectedByChange returns a fresh list', () => {
    expect(affectedByChange(2, -3)).not.toBe(affectedByChange(2, -3))
  })

  it('command functions do not mutate the command, state or catalog', () => {
    const commands: Command[] = [
      placeLamp,
      { kind: 'move', uid: 'b', x: 3, z: 3, rot: 0, autoTile: 'grass' },
      { kind: 'rotate', uid: 'a' },
      { kind: 'store', uid: 'b' },
      { kind: 'sell', uid: 'b' },
      { kind: 'paint', x: 2, z: 2, type: 'grass' },
      { kind: 'changeItemTile', uid: 'a', type: 'land' },
      { kind: 'setLevel', x: 2, z: 2, level: 2 },
      { kind: 'setLevelItem', uid: 'a', level: 2 },
      { kind: 'digUp', x: 1, z: 0 },
    ]

    for (const command of commands) {
      expectDeepPure(() => ({ ...worldOf(), command }), (value) => {
        const result = validate(value.command, value.state, value.catalog)
        if (result.ok) apply(value.command, value.state, value.catalog)
      })
    }
  })

  it('execute does not mutate the history, state or catalog', () => {
    expectDeepPure(() => ({ ...worldOf(), history: EMPTY_HISTORY }), (value) =>
      execute(value.history, value.state, placeLamp, value.catalog),
    )
  })

  it('undo does not mutate the history, state or catalog', () => {
    expectDeepPure(historyFixture, (value) =>
      undo(value.history, value.state, value.catalog),
    )
  })

  it('redo does not mutate the history, state or catalog', () => {
    expectDeepPure(redoFixture, (value) =>
      redo(value.history, value.state, value.catalog),
    )
  })

  it('canUndo and canRedo do not mutate the history', () => {
    expectDeepPure(historyFixture, (value) => canUndo(value.history))
    expectDeepPure(redoFixture, (value) => canRedo(value.history))
  })

  it('executeBatch does not mutate the history, state or catalog', () => {
    expectDeepPure(() => ({ ...worldOf(), history: EMPTY_HISTORY }), (value) =>
      executeBatch(value.history, value.state, stroke, value.catalog),
    )
  })

  it('undo and redo of a batch do not mutate the history, state or catalog', () => {
    expectDeepPure(batchFixture, (value) =>
      undo(value.history, value.state, value.catalog),
    )
    expectDeepPure(batchUndoFixture, (value) =>
      redo(value.history, value.state, value.catalog),
    )
  })
})
