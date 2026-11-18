import { describe, expect, it, vi } from 'vitest'

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

describe('404 redirect', () => {
  it('keeps the query and hash under the project root', () => {
    expect(run404('/evergrow/gallery', '?x=1', '#y')).toHaveBeenCalledWith(
      '/evergrow/?x=1#y',
    )
  })

  it('normalises a repo path without a trailing slash', () => {
    expect(run404('/evergrow', '', '')).toHaveBeenCalledWith('/evergrow/')
    expect(run404('/evergrow/', '', '')).toHaveBeenCalledWith('/evergrow/')
  })

  it('returns the root for the root path', () => {
    expect(run404('/', '', '')).toHaveBeenCalledWith('/')
  })
})
