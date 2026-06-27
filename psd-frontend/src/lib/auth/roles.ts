export const isStaff = (u?: { role?: string }) =>
  u?.role === 'moderator' || u?.role === 'superadmin'

export const isSuperadmin = (u?: { role?: string }) => u?.role === 'superadmin'

export const staffRoleLabel = (role?: string) => {
  if (role === 'superadmin') return 'Super Admin'
  if (role === 'moderator') return 'Humas'
  return null
}
