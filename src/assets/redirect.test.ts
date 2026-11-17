import { describe, expect, it } from 'vitest'
import { redirectTarget } from './redirect'

describe('redirectTarget', () => {
  it('keeps the query and hash under the project root', () => {
    expect(redirectTarget('/evergrow/gallery', '?x=1', '#y')).toBe('/evergrow/?x=1#y')
  })

  it('returns the root for the root path', () => {
    expect(redirectTarget('/')).toBe('/')
  })

  it('normalises a repo path without a trailing slash', () => {
    expect(redirectTarget('/evergrow')).toBe('/evergrow/')
    expect(redirectTarget('/evergrow/')).toBe('/evergrow/')
  })
})
