/** Resolve an unknown path back to the project root, keeping query and hash. */
export function redirectTarget(pathname: string, search = '', hash = ''): string {
  const repo = pathname.split('/')[1] ?? ''
  return `${repo ? `/${repo}/` : '/'}${search}${hash}`
}
