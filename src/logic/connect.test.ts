import { describe, expect, it } from 'vitest'
import { affectedByChange, getConnectionMask } from './connect'
import { key } from './grid'
import type { Occupancy, PlacedItems } from './placement'
import { catalogOf, item, itemsOf, placed } from './testing/fixtures'

const fenceDef = item({ id: 'fence', footprint: [1, 1], connectable: true })
const lampDef = item({ id: 'lamp', footprint: [1, 1] })
const catalog = catalogOf(fenceDef, lampDef)

const occupancyOf = (items: PlacedItems): Occupancy =>
  new Map([...items.values()].map((item) => [key(item.x, item.z), item.uid]))

const maskOf = (items: PlacedItems, uid = 'centre'): number =>
  getConnectionMask(uid, items, occupancyOf(items), catalog)

describe('getConnectionMask', () => {
  it('returns 0 for an isolated item', () => {
    expect(maskOf(itemsOf(placed('centre', fenceDef, 0, 0)))).toBe(0)
  })

  it('returns 5 for a straight north–south run', () => {
    expect(
      maskOf(
        itemsOf(
          placed('centre', fenceDef, 0, 0),
          placed('north', fenceDef, 0, -1),
          placed('south', fenceDef, 0, 1),
        ),
      ),
    ).toBe(5)
  })

  it('returns 3 for a north–east corner', () => {
    expect(
      maskOf(
        itemsOf(
          placed('centre', fenceDef, 0, 0),
          placed('north', fenceDef, 0, -1),
          placed('east', fenceDef, 1, 0),
        ),
      ),
    ).toBe(3)
  })

  it('returns 11 for a T shape missing the south arm', () => {
    expect(
      maskOf(
        itemsOf(
          placed('centre', fenceDef, 0, 0),
          placed('north', fenceDef, 0, -1),
          placed('east', fenceDef, 1, 0),
          placed('west', fenceDef, -1, 0),
        ),
      ),
    ).toBe(11)
  })

  it('returns 15 for a cross', () => {
    expect(
      maskOf(
        itemsOf(
          placed('centre', fenceDef, 0, 0),
          placed('north', fenceDef, 0, -1),
          placed('east', fenceDef, 1, 0),
          placed('south', fenceDef, 0, 1),
          placed('west', fenceDef, -1, 0),
        ),
      ),
    ).toBe(15)
  })

  it('does not connect to a different item id', () => {
    expect(
      maskOf(itemsOf(placed('centre', fenceDef, 0, 0), placed('north', lampDef, 0, -1))),
    ).toBe(0)
  })

  it('returns 0 for adjacent non-connectable items with the same id', () => {
    expect(
      maskOf(itemsOf(placed('centre', lampDef, 0, 0), placed('north', lampDef, 0, -1))),
    ).toBe(0)
  })

  it('returns 0 for a uid that is not placed', () => {
    expect(maskOf(itemsOf(placed('centre', fenceDef, 0, 0)), 'missing')).toBe(0)
  })

  it('returns 0 for occupancy entries with no matching item', () => {
    const items = itemsOf(placed('centre', fenceDef, 0, 0))
    const occupancy: Occupancy = new Map([[key(0, -1), 'ghost']])

    expect(getConnectionMask('centre', items, occupancy, catalog)).toBe(0)
  })

  it('throws when the item id is missing from the catalog', () => {
    const items = itemsOf(placed('centre', fenceDef, 0, 0))

    expect(() =>
      getConnectionMask('centre', items, occupancyOf(items), new Map()),
    ).toThrow('Unknown item id: fence')
  })
})

describe('affectedByChange', () => {
  it('returns the cell itself then N, E, S, W', () => {
    expect(affectedByChange(2, -3)).toEqual([
      { x: 2, z: -3 },
      { x: 2, z: -4 },
      { x: 3, z: -3 },
      { x: 2, z: -2 },
      { x: 1, z: -3 },
    ])
  })
})
