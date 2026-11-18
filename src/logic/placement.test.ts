import { describe, expect, it } from 'vitest'
import { CONFIG, type ItemDef } from '../config/evergrow.config'
import { buildOccupancy, getLevelRange, itemAt, type Occupancy } from './placement'
import { key } from './grid'
import { catalog, cellsIn, cottage, fence, lamp } from './testing/placementFixtures'
import { cell, item, itemsOf, mapWith, placed } from './testing/fixtures'

describe('getLevelRange', () => {
  const range = { min: CONFIG.world.minStack, max: CONFIG.world.maxStack }

  it('returns minStack..maxStack for empty and filled cells (§5.4)', () => {
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

describe('buildOccupancy', () => {
  it('maps every footprint cell of every item to its uid', () => {
    const items = itemsOf(placed('a', cottage, 1, 1), placed('b', lamp, 5, 5))
    const occupancy = buildOccupancy(items, catalog)

    expect(occupancy.size).toBe(5)
    for (const point of cellsIn(1, 1, 2, 2)) {
      expect(occupancy.get(key(point.x, point.z))).toBe('a')
    }
    expect(occupancy.get(key(5, 5))).toBe('b')
  })

  it('gives the same occupancy whatever the insertion order', () => {
    const first = itemsOf(placed('a', cottage, 0, 0), placed('b', lamp, 5, 5))
    const second = itemsOf(placed('b', lamp, 5, 5), placed('a', cottage, 0, 0))

    expect(buildOccupancy(second, catalog)).toEqual(buildOccupancy(first, catalog))
  })

  it('covers the same square footprint when rotated', () => {
    const occupancy = buildOccupancy(itemsOf(placed('a', cottage, 0, 0, 1)), catalog)

    expect(occupancy.size).toBe(4)
    expect(occupancy.get(key(1, 1))).toBe('a')
    expect(occupancy.get(key(2, 0))).toBeUndefined()
  })

  it('throws for an item id missing from the catalog', () => {
    expect(() => buildOccupancy(itemsOf(placed('a', fence, 0, 0)), new Map())).toThrow(
      'Unknown item id: fence',
    )
  })
})

describe('itemAt', () => {
  it('returns the item covering a cell and undefined for an empty cell', () => {
    const items = itemsOf(placed('a', cottage, 1, 1), placed('b', lamp, 5, 5))
    const occupancy = buildOccupancy(items, catalog)

    expect(itemAt(1, 1, occupancy, items)).toEqual(items.get('a'))
    expect(itemAt(2, 1, occupancy, items)).toEqual(items.get('a'))
    expect(itemAt(5, 5, occupancy, items)).toEqual(items.get('b'))
    expect(itemAt(-3, 5, occupancy, items)).toBeUndefined()
    expect(itemAt(5, 5, new Map(), items)).toBeUndefined()
  })

  it('returns undefined when the occupancy uid has no item', () => {
    const occupancy: Occupancy = new Map([[key(0, 0), 'ghost']])
    expect(itemAt(0, 0, occupancy, itemsOf())).toBeUndefined()
  })
})

describe('buildOccupancy with a non-square footprint', () => {
  it('follows the rotated footprint', () => {
    const bench = item({ id: 'bench', footprint: [2, 1] })
    const withBench = new Map<string, ItemDef>([[bench.id, bench]])
    const occupancy = buildOccupancy(itemsOf(placed('b', bench, 0, 0, 1)), withBench)
    expect([...occupancy.keys()]).toEqual(['0,0', '0,1'])
  })
})
