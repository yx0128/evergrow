import { describe, expect, it } from 'vitest'

const modules = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const ALLOWED = new Set(['assets/assetUrl.ts'])

describe('storage guard', () => {
  it('accesses localStorage only through the storage helper', () => {
    const offenders = Object.entries(modules).filter(([path, content]) => {
      const relative = path.replace(/^\/?src\//, '')
      if (relative.endsWith('.test.ts') || relative.endsWith('.test.tsx')) return false
      if (ALLOWED.has(relative)) return false
      return content.includes('localStorage.')
    })
    expect(offenders).toEqual([])
  })
})
