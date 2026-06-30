'use client'

import { getMyTeams } from '@/lib/api/teams'
import { useAuth } from '@/lib/auth/useAuth'
import { isStaff } from '@/lib/auth/roles'
import { canCollaborateOnAsset, isPersonalAssetOwner } from '@/lib/teams/collaboration'
import type { TeamRef } from '@/types/api'
import { useQuery } from '@tanstack/react-query'

export function useAssetCollaboration(team?: TeamRef | null, ownerUsername?: string) {
  const { user, isLoggedIn } = useAuth()
  const needsTeamLookup = isLoggedIn && !!team?.slug && !!user

  const myTeams = useQuery({
    queryKey: ['my-teams'],
    queryFn: async () => (await getMyTeams()).items as { id: string; slug: string }[],
    enabled: needsTeamLookup,
    staleTime: 60_000,
  })

  const owner = ownerUsername ?? ''
  const staff = user ? isStaff(user) : false
  const isPersonalOwner = isPersonalAssetOwner(user, owner)
  const canEdit = canCollaborateOnAsset({
    user,
    ownerUsername: owner,
    team,
    myTeams: myTeams.data,
    isStaff: staff,
  })

  return {
    user,
    canEdit,
    isPersonalOwner,
    isTeamCollaborator: canEdit && !isPersonalOwner && !!team,
    isLoadingTeams: needsTeamLookup && myTeams.isLoading,
  }
}
