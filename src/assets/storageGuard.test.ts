import { describe, expect, it } from 'vitest'

const STORAGE_ACCESS = /\b(?:local|session)Storage\b/
const ALLOWED = new Set(['logic/save.ts'])

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/gm, '$1')
}

/** Return files that bypass the storage helper with direct web storage access. */
function findStorageAccess(files: Record<string, string>): string[] {
  const offenders: string[] = []
  for (const [path, content] of Object.entries(files)) {
    const relative = path.replace(/^\/?src\//, '')
    if (relative.endsWith('.test.ts') || relative.endsWith('.test.tsx')) continue
    if (ALLOWED.has(relative)) continue
    if (STORAGE_ACCESS.test(stripComments(content))) offenders.push(relative)
  }
  return offenders
}

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

  it('does not treat URLs as comments', () => {
    expect(
      findStorageAccess({
        'url.ts': "const u = 'https://a.example'; localStorage.setItem('k', 'v')",
        'trailing.ts': 'const x = 1 // localStorage note',
      }),
    ).toEqual(['url.ts'])
  })
})
