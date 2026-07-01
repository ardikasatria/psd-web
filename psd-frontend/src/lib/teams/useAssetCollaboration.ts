'use client'

import { fetchMyTeams, MY_TEAMS_QUERY_KEY } from '@/lib/teams/myTeamsQuery'
import { useAuth } from '@/lib/auth/useAuth'
import { isStaff } from '@/lib/auth/roles'
import { canCollaborateOnAsset, canRunNotebook, isPersonalAssetOwner } from '@/lib/teams/collaboration'
import type { TeamRef } from '@/types/api'
import { useQuery } from '@tanstack/react-query'

export function useAssetCollaboration(team?: TeamRef | null, ownerUsername?: string) {
  const { user, isLoggedIn } = useAuth()
  const needsTeamLookup = isLoggedIn && !!team?.slug && !!user

  const myTeams = useQuery({
    queryKey: MY_TEAMS_QUERY_KEY,
    queryFn: fetchMyTeams,
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
  const canRun = canRunNotebook({
    user,
    ownerUsername: owner,
    team,
    myTeams: myTeams.data,
  })

  return {
    user,
    canEdit,
    canRun,
    isPersonalOwner,
    isTeamCollaborator: canEdit && !isPersonalOwner && !!team,
    isLoadingTeams: needsTeamLookup && myTeams.isLoading,
  }
}
