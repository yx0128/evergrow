import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import type { ItemDef } from '../config/evergrow.config'
import { validateCatalog } from './catalog'

const validItem: ItemDef = {
  id: 'cottage',
  name: 'Cottage',
  category: 'buildings',
  price: 80,
  footprint: [2, 2],
  defaultTile: 'grass',
  allowedTiles: ['grass', 'land'],
  connectable: false,
  rotatable: true,
  model: 'assets/models/cottage.glb',
  thumb: 'assets/thumbs/cottage.png',
  emissive: false,
}

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

  it('rejects a default tile that is not allowed', () => {
    expect(
      validateCatalog([{ ...validItem, defaultTile: 'water' }], []),
    ).toContain('default tile not allowed: cottage')
  })

  it('rejects rotatable connectable items', () => {
    expect(
      validateCatalog([{ ...validItem, connectable: true, rotatable: true }], []),
    ).toContain('connectable item must not rotate: cottage')
  })

  it('rejects unknown starter items', () => {
    expect(validateCatalog([validItem], ['missing'])).toContain(
      'unknown starter item: missing',
    )
  })
})
