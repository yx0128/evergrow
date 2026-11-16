import { describe, expect, it } from 'vitest'
import { evergrowConfig } from '../config/evergrow.config'
import { assetUrl, storageKey } from './assetUrl'

describe('assetUrl', () => {
  it('prefixes the base URL', () => {
    expect(assetUrl('assets/models/cottage.glb')).toBe('/assets/models/cottage.glb')
  })

  it('strips leading slashes so the base is never doubled', () => {
    expect(assetUrl('/assets/thumbs/cottage.png')).toBe('/assets/thumbs/cottage.png')
  })
})

describe('storageKey', () => {
  it('namespaces keys for the shared github.io origin', () => {
    expect(storageKey('save')).toBe(`${evergrowConfig.ui.storagePrefix}save`)
    expect(storageKey('save')).toBe('evergrow:save')
  })
})
