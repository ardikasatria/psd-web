import type { MyTeam, TeamRef } from '@/types/api'

type UserLike = { username: string; role?: string } | null | undefined

export function isTeamMemberOf(myTeams: MyTeam[] | undefined, team: TeamRef | null | undefined): boolean {
  if (!team?.slug || !myTeams?.length) return false
  return myTeams.some((t) => t.slug === team.slug)
}

export function isPersonalAssetOwner(user: UserLike, ownerUsername: string): boolean {
  return !!user && !!ownerUsername && user.username === ownerUsername
}

export function canCollaborateOnAsset(opts: {
  user: UserLike
  ownerUsername: string
  team?: TeamRef | null
  myTeams?: MyTeam[]
  isStaff?: boolean
}): boolean {
  const { user, ownerUsername, team, myTeams, isStaff } = opts
  if (!user) return false
  if (isStaff) return true
  if (isPersonalAssetOwner(user, ownerUsername)) return true
  if (team && isTeamMemberOf(myTeams, team)) return true
  return false
}

/** Jalankan editor/kernel notebook — hanya pemilik atau anggota tim aset (bukan staff). */
export function canRunNotebook(opts: {
  user: UserLike
  ownerUsername: string
  team?: TeamRef | null
  myTeams?: MyTeam[]
}): boolean {
  const { user, ownerUsername, team, myTeams } = opts
  if (!user) return false
  if (isPersonalAssetOwner(user, ownerUsername)) return true
  if (team && isTeamMemberOf(myTeams, team)) return true
  return false
}
