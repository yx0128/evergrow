import { describe, expect, it } from 'vitest'
import { findStorageAccess } from './storageGuard'

const modules = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('storage guard', () => {
  it('accesses localStorage only through the storage helper', () => {
    expect(findStorageAccess(modules)).toEqual([])
  })

  it('flags direct, bracket and session storage access', () => {
    expect(
      findStorageAccess({
        'direct.ts': 'localStorage.setItem("k", "v")',
        'bracket.ts': 'window["localStorage"].getItem("k")',
        'session.ts': 'sessionStorage.setItem("k", "v")',
        'safe.ts': 'const key = storageKey("save")',
      }),
    ).toEqual(['direct.ts', 'bracket.ts', 'session.ts'])
  })

  it('ignores mentions inside comments', () => {
    expect(
      findStorageAccess({
        'line.ts': '// localStorage.setItem("k", "v")',
        'block.ts': '/* sessionStorage.getItem("k") */',
        'after.ts': '// note\nlocalStorage.setItem("k", "v")',
      }),
    ).toEqual(['after.ts'])
  })
})
