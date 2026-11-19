import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import type { ItemDef } from '../config/evergrow.config'
import { itemDefinition, validateCatalog } from './catalog'
import { item } from './testing/fixtures'

const validItem: ItemDef = {
  id: 'cottage',
  name: 'Cottage',
  category: 'buildings',
  price: 80,
  footprint: [2, 2],
  defaultTile: 'grass',
  allowedTiles: ['grass', 'land'],
  connectable: false,
  model: 'assets/models/cottage.glb',
  thumb: 'assets/thumbs/cottage.png',
  emissive: false,
}

describe('itemDefinition', () => {
  const catalog = new Map([[validItem.id, validItem]])

  it('returns the definition for a known id', () => {
    expect(itemDefinition(catalog, 'cottage')).toBe(validItem)
  })

  it('throws for an unknown id', () => {
    expect(() => itemDefinition(catalog, 'missing')).toThrow('Unknown item id: missing')
  })
})

describe('validateCatalog', () => {
  it('accepts a valid catalog and the shipped config', () => {
    expect(validateCatalog([validItem], ['cottage'])).toEqual([])
    expect(validateCatalog(CONFIG.items, CONFIG.starter.items)).toEqual([])
  })

  it('rejects empty and duplicate ids', () => {
    expect(validateCatalog([{ ...validItem, id: '' }], [])).toContain('item has an empty id')
    expect(validateCatalog([validItem, validItem], [])).toContain('duplicate item id: cottage')
  })

  it('rejects negative prices', () => {
    expect(validateCatalog([{ ...validItem, price: -1 }], [])).toContain(
      'negative price: cottage',
    )
  })

  it('rejects invalid footprints', () => {
    expect(validateCatalog([{ ...validItem, footprint: [0, 2] }], [])).toContain(
      'invalid footprint: cottage',
    )
  })

  it('rejects non-square footprints and accepts 1×1 and 2×2', () => {
    expect(validateCatalog([{ ...validItem, footprint: [2, 1] }], [])).toContain(
      'non-square footprint: cottage',
    )
    expect(validateCatalog([{ ...validItem, footprint: [1, 1] }], [])).toEqual([])
    expect(validateCatalog([validItem], [])).toEqual([])
  })

  it('rejects a connectable item larger than 1×1', () => {
    const bigFence = item({ id: 'big-fence', footprint: [2, 2], connectable: true })
    expect(validateCatalog([bigFence], [])).toEqual([
      'connectable item must be 1×1: big-fence',
    ])
  })

  it('rejects a connectable item that is 1 wide but not 1 deep', () => {
    const longFence = item({ id: 'long-fence', footprint: [1, 2], connectable: true })
    expect(validateCatalog([longFence], [])).toEqual([
      'non-square footprint: long-fence',
      'connectable item must be 1×1: long-fence',
    ])
  })

  it('accepts a 1×1 connectable item and a 2×2 non-connectable item', () => {
    const fence = item({ id: 'fence', footprint: [1, 1], connectable: true })
    const cottage = item({ id: 'cottage', footprint: [2, 2] })
    expect(validateCatalog([fence, cottage], [])).toEqual([])
  })

  it('rejects a default tile that is not allowed', () => {
    expect(
      validateCatalog([{ ...validItem, defaultTile: 'water' }], []),
    ).toContain('default tile not allowed: cottage')
  })

  it('rejects unknown starter items', () => {
    expect(validateCatalog([validItem], ['missing'])).toContain(
      'unknown starter item: missing',
    )
  })
})

describe('validateCatalog footprint range', () => {
  it('reports an invalid footprint for zero depth', () => {
    expect(validateCatalog([{ ...validItem, footprint: [2, 0] }], [])).toContain(
      'invalid footprint: cottage',
    )
  })
})
