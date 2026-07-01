export const ORG_TYPES = ['personal', 'community', 'academic', 'umkm', 'enterprise'] as const
export type OrgType = (typeof ORG_TYPES)[number]

export const ACCESS_LEVELS = ['read', 'triage', 'write', 'maintain', 'admin'] as const
export type AccessLevel = (typeof ACCESS_LEVELS)[number]

const DEMAND_TYPES = new Set<OrgType>(['umkm', 'enterprise', 'academic'])

const RESERVED_HANDLES = new Set([
  'new',
  'settings',
  'admin',
  'api',
  'org',
  'orgs',
  'login',
  'logout',
  'explore',
  'search',
  'about',
  'help',
  'support',
  'billing',
])

const LEVEL_RANK: Record<string, number> = {
  read: 0,
  triage: 1,
  write: 2,
  maintain: 3,
  admin: 4,
}

export const orgTypeLabel: Record<OrgType, string> = {
  personal: 'Personal',
  community: 'Komunitas',
  academic: 'Akademik',
  umkm: 'UMKM',
  enterprise: 'Enterprise',
}

export const verificationLabel: Record<string, string> = {
  unverified: 'Belum terverifikasi',
  pending: 'Menunggu verifikasi',
  verified: 'Terverifikasi',
  rejected: 'Verifikasi ditolak',
}

export function validateHandle(handle: string): string | null {
  const h = handle.trim().toLowerCase()
  if (!/^[a-z0-9](?:[a-z0-9-]{1,37}[a-z0-9])$/.test(h)) {
    return 'Handle 3–39 karakter: huruf kecil/angka/tanda hubung, tak diawali/diakhiri hubung.'
  }
  if (h.includes('--')) return 'Handle tak boleh memuat tanda hubung ganda.'
  if (RESERVED_HANDLES.has(h)) return `Handle "${h}" sudah dipakai sistem.`
  return null
}

export function requiresVerification(type: string): boolean {
  return DEMAND_TYPES.has(type as OrgType)
}

export function canPostOpportunity(type: string, verification: string): boolean {
  return DEMAND_TYPES.has(type as OrgType) && verification === 'verified'
}

export function isDemandOrg(type: string): boolean {
  return DEMAND_TYPES.has(type as OrgType)
}

export function maxAccessLevel(levels: (string | null | undefined)[]): string | null {
  const valid = levels.filter((l): l is string => !!l && l in LEVEL_RANK)
  if (!valid.length) return null
  return valid.reduce((best, l) => (LEVEL_RANK[l] > LEVEL_RANK[best] ? l : best))
}

export function resolveAssetLevel(opts: {
  role?: string | null
  orgBase?: string | null
  teamLevels?: string[]
  directLevel?: string | null
}): string | null {
  if (opts.role === 'owner' || opts.role === 'admin') return 'admin'
  return maxAccessLevel([opts.orgBase, ...(opts.teamLevels ?? []), opts.directLevel])
}

export function countOwners(members: { role: string }[]): number {
  return members.filter((m) => m.role === 'owner').length
}

export function isLastOwner(members: { user_id: string; role: string }[], targetUserId: string): boolean {
  const target = members.find((m) => m.user_id === targetUserId)
  if (!target || target.role !== 'owner') return false
  return countOwners(members) <= 1
}
