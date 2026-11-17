const STORAGE_ACCESS = /\b(?:local|session)Storage\b/
const ALLOWED = new Set(['assets/assetUrl.ts'])

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

/** Return files that bypass the storage helper with direct web storage access. */
export function findStorageAccess(files: Record<string, string>): string[] {
  const offenders: string[] = []
  for (const [path, content] of Object.entries(files)) {
    const relative = path.replace(/^\/?src\//, '')
    if (relative.endsWith('.test.ts') || relative.endsWith('.test.tsx')) continue
    if (ALLOWED.has(relative)) continue
    if (STORAGE_ACCESS.test(stripComments(content))) offenders.push(relative)
  }
  return offenders
}
