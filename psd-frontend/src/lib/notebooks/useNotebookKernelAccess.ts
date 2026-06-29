'use client'

import { getMyNotebookKernelRequest } from '@/lib/api/notebook-kernel'
import { kernelServerAvailable } from '@/lib/gamification/config'
import { hubTierFromGamificationLevel } from '@/lib/notebooks/tier'
import { getMyGamification } from '@/lib/api/gamification'
import { useQuery } from '@tanstack/react-query'

/** Kernel server via tier gamifikasi atau pengajuan yang disetujui. */
export function useNotebookKernelAccess() {
  const gamification = useQuery({
    queryKey: ['me', 'gamification'],
    queryFn: getMyGamification,
    retry: false,
  })

  const grant = useQuery({
    queryKey: ['notebook-kernel-request'],
    queryFn: getMyNotebookKernelRequest,
    retry: false,
  })

  const tierSlug = hubTierFromGamificationLevel(gamification.data?.tier.level ?? 0)
  const fromTier = kernelServerAvailable(tierSlug)
  const fromGrant = grant.data?.status === 'approved'
  const pending = grant.data?.status === 'pending'

  return {
    tierSlug,
    canServer: fromTier || fromGrant,
    pendingGrant: pending && !fromTier,
    isLoading: gamification.isLoading || grant.isLoading,
    application: grant.data,
  }
}
