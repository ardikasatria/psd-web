export const ORG_ROLES = ['owner', 'admin', 'member', 'billing_manager'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

const ORG_PERMS: Record<string, Set<string>> = {
  owner: new Set([
    'view_org',
    'manage_members',
    'manage_teams',
    'manage_assets',
    'manage_settings',
    'post_opportunity',
    'manage_recruitment',
    'manage_verification',
    'manage_billing',
    'delete_org',
    'transfer_ownership',
  ]),
  admin: new Set([
    'view_org',
    'manage_members',
    'manage_teams',
    'manage_assets',
    'manage_settings',
    'post_opportunity',
    'manage_recruitment',
    'manage_verification',
  ]),
  member: new Set(['view_org']),
  billing_manager: new Set(['view_org', 'manage_billing']),
}

export function orgCan(role: string | null | undefined, action: string): boolean {
  if (!role) return false
  return ORG_PERMS[role]?.has(action) ?? false
}

export const orgRoleLabel: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Anggota',
  billing_manager: 'Billing',
}

export function canSetOrgRole(
  actorRole: string | null | undefined,
  targetCurrent: string,
  targetNew: string,
): boolean {
  if (!actorRole) return false
  if (targetNew === 'owner' && actorRole !== 'owner') return false
  if (actorRole === 'owner') return ORG_ROLES.includes(targetNew as OrgRole)
  if (actorRole === 'admin') {
    return (
      (targetCurrent === 'member' || targetCurrent === 'billing_manager') &&
      (targetNew === 'member' || targetNew === 'billing_manager')
    )
  }
  return false
}
