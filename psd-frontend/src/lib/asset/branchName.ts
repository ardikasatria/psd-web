const INVALID = /[ ~^:?*[\t]/

export function isValidBranchName(name: string): boolean {
  if (!name || name === '.' || name === '..') return false
  if (name.startsWith('/') || name.endsWith('/') || name.includes('//')) return false
  if (name.startsWith('.') || name.endsWith('.lock') || name.endsWith('.')) return false
  if (name.includes('..') || name.includes('@{')) return false
  if ([...INVALID].some((c) => name.includes(c))) return false
  return /^[\w./-]+$/.test(name)
}
