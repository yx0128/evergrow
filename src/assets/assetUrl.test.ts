import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONFIG } from '../config/evergrow.config'
import { assetUrl, storageKey } from './assetUrl'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('assetUrl', () => {
  it('prefixes the local base URL', () => {
    expect(assetUrl('assets/models/cottage.glb')).toBe('/assets/models/cottage.glb')
  })

  it('strips leading slashes so the base is never doubled', () => {
    expect(assetUrl('/assets/thumbs/cottage.png')).toBe('/assets/thumbs/cottage.png')
  })

  it('uses the production GitHub Pages base', () => {
    vi.stubEnv('BASE_URL', '/evergrow/')
    expect(assetUrl('assets/models/cottage.glb')).toBe('/evergrow/assets/models/cottage.glb')
  })
})

describe('storageKey', () => {
  it('namespaces keys for the shared github.io origin', () => {
    expect(storageKey('save')).toBe(`${CONFIG.ui.storagePrefix}save`)
    expect(storageKey('save')).toBe('evergrow:save')
  })
})
