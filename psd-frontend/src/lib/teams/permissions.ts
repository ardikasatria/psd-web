export const TEAM_ROLES = ['owner', 'co-owner', 'member'] as const
export type TeamRole = (typeof TEAM_ROLES)[number]

export const TEAM_ASSET_KINDS = [
  'project',
  'model',
  'dataset',
  'notebook',
  'idea_space',
  'data_factory',
  'transformer_space',
  'model_registry',
  'synthetic_data',
  'analytics_space',
  'competition',
] as const

const PERMS: Record<string, Set<string>> = {
  owner: new Set([
    'manage_asset',
    'post_discussion',
    'moderate_members',
    'manage_discussion',
    'invite',
    'kick',
    'delete_team',
    'transfer_ownership',
  ]),
  'co-owner': new Set([
    'manage_asset',
    'post_discussion',
    'moderate_members',
    'manage_discussion',
  ]),
  member: new Set(['manage_asset', 'post_discussion']),
  admin: new Set([
    'manage_asset',
    'post_discussion',
    'moderate_members',
    'manage_discussion',
  ]),
}

export function normalizeTeamRole(role: string | null | undefined): TeamRole | null {
  if (!role) return null
  if (role === 'admin') return 'co-owner'
  if (TEAM_ROLES.includes(role as TeamRole)) return role as TeamRole
  return null
}

export function can(role: string | null | undefined, action: string): boolean {
  const r = normalizeTeamRole(role)
  if (!r) return false
  return PERMS[r]?.has(action) ?? false
}

export function canManageTeamAsset(role: string | null | undefined): boolean {
  return normalizeTeamRole(role) !== null
}

export const roleLabel: Record<string, string> = {
  owner: 'Owner',
  'co-owner': 'Co-owner',
  admin: 'Co-owner',
  member: 'Anggota',
}
