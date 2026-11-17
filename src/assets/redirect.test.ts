import { describe, expect, it, vi } from 'vitest'
import { redirectTarget } from './redirect'

const pages = import.meta.glob('/public/404.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function run404(pathname: string, search: string, hash: string) {
  const html = pages['/public/404.html'] ?? ''
  const script = /<script[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? ''
  const replace = vi.fn()
  new Function('location', script)({ pathname, search, hash, replace })
  return replace
}

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

  it('keeps public/404.html in sync with redirectTarget', () => {
    const cases: Array<[string, string, string]> = [
      ['/evergrow/gallery', '?x=1', '#y'],
      ['/evergrow', '', ''],
      ['/', '', ''],
    ]
    for (const [pathname, search, hash] of cases) {
      const replace = run404(pathname, search, hash)
      expect(replace).toHaveBeenCalledWith(redirectTarget(pathname, search, hash))
    }
  })
})
