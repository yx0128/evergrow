import { afterEach, describe, expect, it, vi } from 'vitest'
import { assetUrl } from './assetUrl'

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
