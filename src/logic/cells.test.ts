import { describe, expect, it } from 'vitest'
import { CONFIG, type InvalidReason, type ItemDef } from '../config/evergrow.config'
import {
  digUp,
  getCell,
  getLevelRange,
  MIN_LEVEL,
  paint,
  removeCell,
  setCell,
  setLevel,
  setType,
} from './cells'
import type { Cell, CellMap, CellResult } from './cells'
import { key } from './grid'
import { buildOccupancy, type PlacedItem, type PlacedItems } from './placement'

const HALF_WORLD = CONFIG.world.maxSize / 2
const HALF_START = CONFIG.world.startZone / 2
const MAX = CONFIG.world.maxStack

const cell = (
  x: number,
  z: number,
  type: Cell['type'] = 'grass',
  level = 1,
): Cell => ({ x, z, type, level })

const mapWith = (...cells: Cell[]): CellMap =>
  new Map(cells.map((it) => [key(it.x, it.z), it]))

function expectOk(result: CellResult): CellMap {
  if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
  return result.cells
}

function expectFail(result: CellResult, reason: InvalidReason): void {
  expect(result).toEqual({ ok: false, reason })
}

describe('getCell', () => {
  it('throws on non-integer coordinates', () => {
    expect(() => getCell(mapWith(), 1.5, 0)).toThrow('Invalid cell coordinates: 1.5,0')
  })
})

describe('setCell', () => {
  it('adds a level-1 cell without mutating the input map', () => {
    const cells = mapWith()
    const result = setCell(cells, cell(2, -3, 'land'))

    expect(cells.size).toBe(0)
    expect(expectOk(result).get(key(2, -3))).toEqual(cell(2, -3, 'land'))
  })

  it('accepts level 1 and maxStack', () => {
    expect(expectOk(setCell(mapWith(), cell(0, 0, 'grass', MIN_LEVEL))).size).toBe(1)
    expect(expectOk(setCell(mapWith(), cell(0, 0, 'grass', MAX))).size).toBe(1)
  })

  it('replaces an existing cell', () => {
    const cells = mapWith(cell(1, 1, 'grass', 3))
    const next = expectOk(setCell(cells, cell(1, 1, 'water', 4)))

    expect(getCell(cells, 1, 1)).toEqual(cell(1, 1, 'grass', 3))
    expect(getCell(next, 1, 1)).toEqual(cell(1, 1, 'water', 4))
  })

  it('throws on non-integer coordinates', () => {
    expect(() => setCell(mapWith(), cell(1.5, 0))).toThrow(
      'Invalid cell coordinates: 1.5,0',
    )
  })

  it('rejects invalid levels and stores nothing', () => {
    const cases: [number, InvalidReason][] = [
      [0, 'minStack'],
      [MAX + 1, 'maxStack'],
      [NaN, 'minStack'],
      [2.5, 'minStack'],
      [Infinity, 'maxStack'],
      [-Infinity, 'minStack'],
    ]
    for (const [level, reason] of cases) {
      const cells = mapWith()
      const before = [...cells]

      expectFail(setCell(cells, cell(0, 0, 'grass', level)), reason)

      expect([...cells]).toEqual(before)
      expect(cells.size).toBe(0)
    }
  })
})

describe('removeCell', () => {
  it('removes one cell and leaves the rest untouched', () => {
    const cells = mapWith(cell(0, 0), cell(1, 0, 'land'))
    const next = removeCell(cells, 0, 0)

    expect(cells.size).toBe(2)
    expect(next.size).toBe(1)
    expect(next.has(key(0, 0))).toBe(false)
    expect(next.has(key(1, 0))).toBe(true)
  })

  it('throws on non-integer coordinates', () => {
    expect(() => removeCell(mapWith(), 1.5, 0)).toThrow(
      'Invalid cell coordinates: 1.5,0',
    )
  })

  it('removes x,z and not z,x', () => {
    const cells = mapWith(cell(1, 2), cell(2, 1))
    const next = removeCell(cells, 1, 2)

    expect(next.has(key(1, 2))).toBe(false)
    expect(next.has(key(2, 1))).toBe(true)
  })

  it('returns a new map when the cell does not exist', () => {
    const cells = mapWith(cell(0, 0))
    const next = removeCell(cells, 5, 5)

    expect(next).not.toBe(cells)
    expect(next).toEqual(cells)
  })
})

describe('setLevel', () => {
  it('accepts level 1 and maxStack', () => {
    const cells = mapWith(cell(-2, 4, 'water', 2))
    expect(getCell(expectOk(setLevel(cells, -2, 4, MIN_LEVEL)), -2, 4)?.level).toBe(
      MIN_LEVEL,
    )
    expect(getCell(expectOk(setLevel(cells, -2, 4, MAX)), -2, 4)?.level).toBe(MAX)
  })

  it('changes only the level', () => {
    const cells = mapWith(cell(-2, 4, 'water', 2))
    const next = expectOk(setLevel(cells, -2, 4, 5))

    expect(getCell(cells, -2, 4)).toEqual(cell(-2, 4, 'water', 2))
    expect(getCell(next, -2, 4)).toEqual(cell(-2, 4, 'water', 5))
  })

  it('rejects out-of-range and non-integer levels without changing the input', () => {
    const cases: [number, InvalidReason][] = [
      [0, 'minStack'],
      [MAX + 1, 'maxStack'],
      [NaN, 'minStack'],
      [2.5, 'minStack'],
      [Infinity, 'maxStack'],
      [-Infinity, 'minStack'],
    ]
    const cells = mapWith(cell(0, 0, 'grass', 3))
    const before = [...cells]

    for (const [level, reason] of cases) {
      expectFail(setLevel(cells, 0, 0, level), reason)
      expect([...cells]).toEqual(before)
      expect(getCell(cells, 0, 0)?.level).toBe(3)
    }
  })

  it('leaves an empty cell unchanged', () => {
    const cells = mapWith(cell(0, 0))
    const result = setLevel(cells, 9, 9, 4)

    expect(result.ok).toBe(true)
    expect(expectOk(result)).toBe(cells)
  })

  it('throws on non-integer coordinates', () => {
    expect(() => setLevel(mapWith(), 1.5, 0, 2)).toThrow(
      'Invalid cell coordinates: 1.5,0',
    )
  })

  it('on an empty cell ignores an invalid level', () => {
    const cells = mapWith()
    const result = setLevel(cells, 9, 9, MAX + 1)

    expect(result.ok).toBe(true)
    expect(expectOk(result)).toBe(cells)
  })
})

describe('setType', () => {
  it('changes only the type', () => {
    const cells = mapWith(cell(3, 3, 'grass', 6))
    const next = expectOk(setType(cells, 3, 3, 'water'))

    expect(getCell(cells, 3, 3)?.type).toBe('grass')
    expect(getCell(next, 3, 3)).toEqual(cell(3, 3, 'water', 6))
  })

  it('leaves an empty cell unchanged', () => {
    const cells = mapWith()
    const result = setType(cells, 1, 2, 'land')

    expect(result.ok).toBe(true)
    expect(expectOk(result)).toBe(cells)
  })

  it('throws on non-integer coordinates', () => {
    expect(() => setType(mapWith(), 1.5, 0, 'land')).toThrow(
      'Invalid cell coordinates: 1.5,0',
    )
  })
})

describe('paint', () => {
  it('creates a level-1 cell in the start zone', () => {
    const result = paint(mapWith(), 0, 0, 'water')
    expect(getCell(expectOk(result), 0, 0)).toEqual(cell(0, 0, 'water', MIN_LEVEL))
  })

  it('changes type but keeps the level of an existing cell', () => {
    const cells = mapWith(cell(2, 3, 'grass', 5))
    expect(getCell(expectOk(paint(cells, 2, 3, 'land')), 2, 3)).toEqual(
      cell(2, 3, 'land', 5),
    )
    expect(getCell(cells, 2, 3)).toEqual(cell(2, 3, 'grass', 5))
  })

  it('rejects empty cells outside the start zone and the ring', () => {
    expectFail(paint(mapWith(), HALF_START + 2, 0, 'grass'), 'outsideBuildableZone')
  })

  it('rejects a cell just outside the world edge even inside an edge tile ring', () => {
    const cells = mapWith(cell(HALF_WORLD - 1, 0))
    expectFail(paint(cells, HALF_WORLD, 0, 'grass'), 'outsideWorld')
  })

  it('returns outsideWorld for invalid coordinates without throwing', () => {
    for (const [x, z] of [
      [1.5, 0],
      [NaN, 0],
    ]) {
      expect(() => paint(mapWith(), x, z, 'grass')).not.toThrow()
      expectFail(paint(mapWith(), x, z, 'grass'), 'outsideWorld')
    }
  })
})

describe('digUp', () => {
  it('returns outsideWorld for an integer outside the world', () => {
    expectFail(digUp(mapWith(), HALF_WORLD, 0), 'outsideWorld')
  })

  it('lowers x,z and not z,x', () => {
    const cells = mapWith(cell(1, 2, 'land', 3), cell(2, 1, 'grass', 5))
    const next = expectOk(digUp(cells, 1, 2))

    expect(getCell(next, 1, 2)?.level).toBe(2)
    expect(getCell(next, 2, 1)?.level).toBe(5)
  })

  it('takes level 2 down to level 1', () => {
    const cells = mapWith(cell(1, 1, 'land', 2))

    expect(getCell(expectOk(digUp(cells, 1, 1)), 1, 1)).toEqual(cell(1, 1, 'land', 1))
  })

  it('removes one level', () => {
    const cells = mapWith(cell(1, 1, 'land', 3))
    const next = expectOk(digUp(cells, 1, 1))

    expect(getCell(next, 1, 1)).toEqual(cell(1, 1, 'land', 2))
    expect(getCell(cells, 1, 1)).toEqual(cell(1, 1, 'land', 3))
  })

  it('removes the cell at level 1', () => {
    const cells = mapWith(cell(1, 1, 'land', MIN_LEVEL))
    const next = expectOk(digUp(cells, 1, 1))

    expect(next.has(key(1, 1))).toBe(false)
    expect(next.size).toBe(0)
  })

  it('leaves an empty cell unchanged', () => {
    const cells = mapWith(cell(1, 1))
    const result = digUp(cells, 4, 4)

    expect(result.ok).toBe(true)
    expect(expectOk(result)).toBe(cells)
  })

  it('returns outsideWorld for invalid coordinates without throwing', () => {
    expect(() => digUp(mapWith(), 0.5, 0)).not.toThrow()
    expectFail(digUp(mapWith(), 0.5, 0), 'outsideWorld')
    expectFail(digUp(mapWith(), NaN, 0), 'outsideWorld')
  })
})

describe('getLevelRange', () => {
  const item = (
    overrides: Partial<ItemDef> & Pick<ItemDef, 'id' | 'footprint'>,
  ): ItemDef => ({
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
  const lamp = item({ id: 'lamp', footprint: [1, 1] })
  const cottage = item({ id: 'cottage', footprint: [2, 2] })
  const catalog = new Map<string, ItemDef>([
    [lamp.id, lamp],
    [cottage.id, cottage],
  ])
  const placed = (
    uid: string,
    def: ItemDef,
    x = 0,
    z = 0,
    rot: PlacedItem['rot'] = 0,
  ): PlacedItem => ({ uid, id: def.id, x, z, rot })
  const itemsOf = (...list: ReadonlyArray<PlacedItem>): PlacedItems =>
    new Map(list.map((it) => [it.uid, it]))
  const range = { min: MIN_LEVEL, max: MAX }

  it('returns minLevel..maxStack for empty and filled cells (§5.4)', () => {
    const empty = itemsOf()
    expect(
      getLevelRange(0, 0, { cells: mapWith(), occupancy: new Map(), items: empty }, catalog),
    ).toEqual(range)
    expect(
      getLevelRange(
        0,
        0,
        { cells: mapWith(cell(0, 0, 'grass', 4)), occupancy: new Map(), items: empty },
        catalog,
      ),
    ).toEqual(range)
  })

  it('returns null under any item', () => {
    const cottageItems = itemsOf(placed('a', cottage, 1, 1))
    const cottageOccupancy = buildOccupancy(cottageItems, catalog)
    expect(
      getLevelRange(1, 1, { cells: mapWith(), occupancy: cottageOccupancy, items: cottageItems }, catalog),
    ).toBeNull()

    const lampItems = itemsOf(placed('a', lamp, 0, 0))
    const lampOccupancy = buildOccupancy(lampItems, catalog)
    expect(
      getLevelRange(0, 0, { cells: mapWith(), occupancy: lampOccupancy, items: lampItems }, catalog),
    ).toBeNull()
  })

  it('throws when an occupancy uid has no matching item', () => {
    const occupancy = new Map([[key(0, 0), 'ghost']])

    expect(() =>
      getLevelRange(0, 0, { cells: mapWith(), occupancy, items: itemsOf() }, catalog),
    ).toThrow('Unknown item uid: ghost')
  })

  it('throws when the item id is missing from the catalog', () => {
    const items = itemsOf(placed('a', cottage, 0, 0))
    const occupancy = new Map([[key(0, 0), 'a']])

    expect(() =>
      getLevelRange(0, 0, { cells: mapWith(), occupancy, items }, new Map()),
    ).toThrow('Unknown item id: cottage')
  })

  it('looks up x,z and not z,x', () => {
    const items = itemsOf(placed('a', lamp, 1, 2))
    const occupancy = buildOccupancy(items, catalog)

    expect(getLevelRange(1, 2, { cells: mapWith(), occupancy, items }, catalog)).toBeNull()
    expect(getLevelRange(2, 1, { cells: mapWith(), occupancy, items }, catalog)).toEqual(
      range,
    )
  })

  it('treats an empty-string uid as an item', () => {
    const items = itemsOf(placed('', lamp, 0, 0))
    const occupancy = new Map([[key(0, 0), '']])

    expect(getLevelRange(0, 0, { cells: mapWith(), occupancy, items }, catalog)).toBeNull()
  })

  it('ignores neighbouring heights', () => {
    const cells = mapWith(
      cell(0, 0, 'grass', 1),
      cell(0, -1, 'grass', 1),
      cell(1, 0, 'grass', 1),
      cell(0, 1, 'grass', 1),
      cell(-1, 0, 'grass', 1),
    )

    expect(getLevelRange(0, 0, { cells, occupancy: new Map(), items: itemsOf() }, catalog)).toEqual(
      range,
    )
  })

  it('is the full range for every tile type', () => {
    for (const type of ['grass', 'land', 'water'] as const) {
      const cells = mapWith(cell(0, 0, type, 1))
      expect(
        getLevelRange(0, 0, { cells, occupancy: new Map(), items: itemsOf() }, catalog),
      ).toEqual(range)
    }
  })
})

describe('no water or neighbour rules (D014)', () => {
  it('setCell stores water at any height beside any neighbour', () => {
    const cells = mapWith(cell(1, 0, 'land', 1))
    const next = expectOk(setCell(cells, cell(0, 0, 'water', 5)))

    expect(getCell(next, 0, 0)).toEqual(cell(0, 0, 'water', 5))
  })

  it('setLevel raises water above a lower neighbour', () => {
    const cells = mapWith(cell(0, 0, 'water', 1), cell(1, 0, 'land', 1))

    expect(getCell(expectOk(setLevel(cells, 0, 0, MAX)), 0, 0)?.level).toBe(MAX)
  })

  it('setLevel raises land beside water', () => {
    const cells = mapWith(cell(0, 0, 'land', 1), cell(1, 0, 'water', 1))

    expect(getCell(expectOk(setLevel(cells, 0, 0, MAX)), 0, 0)?.level).toBe(MAX)
  })

  it('setType makes water beside a different height', () => {
    const cells = mapWith(cell(0, 0, 'land', 2), cell(1, 0, 'grass', 5))

    expect(getCell(expectOk(setType(cells, 0, 0, 'water')), 0, 0)).toEqual(
      cell(0, 0, 'water', 2),
    )
  })

  it('paint turns a raised column into water', () => {
    const cells = mapWith(cell(2, 3, 'grass', 5))

    expect(getCell(expectOk(paint(cells, 2, 3, 'water')), 2, 3)).toEqual(
      cell(2, 3, 'water', 5),
    )
  })

  it('paint turns raised water into land', () => {
    const cells = mapWith(cell(2, 3, 'water', 5))

    expect(getCell(expectOk(paint(cells, 2, 3, 'land')), 2, 3)).toEqual(
      cell(2, 3, 'land', 5),
    )
  })

  it('paint places water beside land', () => {
    const cells = mapWith(cell(0, 0, 'land'))

    expect(getCell(expectOk(paint(cells, 1, 0, 'water')), 1, 0)?.type).toBe('water')
  })

  it('paint places land beside water', () => {
    const cells = mapWith(cell(0, 0, 'water'))

    expect(getCell(expectOk(paint(cells, 1, 0, 'land')), 1, 0)?.type).toBe('land')
  })

  it('paint places water beside a raised tile', () => {
    const cells = mapWith(cell(0, 0, 'land', MAX))

    expect(getCell(expectOk(paint(cells, 1, 0, 'water')), 1, 0)).toEqual(
      cell(1, 0, 'water', MIN_LEVEL),
    )
  })

  it('paint places water in the ring outside the start zone', () => {
    const cells = mapWith(cell(HALF_START - 1, 0, 'grass'))

    expect(getCell(expectOk(paint(cells, HALF_START + 3, 0, 'water')), HALF_START + 3, 0)?.type).toBe(
      'water',
    )
  })

  it('digUp lowers water one level at a time', () => {
    const cells = mapWith(cell(1, 1, 'water', 3))

    expect(getCell(expectOk(digUp(cells, 1, 1)), 1, 1)).toEqual(cell(1, 1, 'water', 2))
  })

  it('digUp removes level-1 water', () => {
    const cells = mapWith(cell(1, 1, 'water', 1))

    expect(expectOk(digUp(cells, 1, 1)).size).toBe(0)
  })
})
