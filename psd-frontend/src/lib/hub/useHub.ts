'use client'

import { getHubConfig, hubLaunchUrl } from '@/lib/api/hub'
import { useQuery } from '@tanstack/react-query'

const envHubUrl = () => process.env.NEXT_PUBLIC_HUB_URL?.trim().replace(/\/$/, '') ?? ''

export function useHub() {
  const config = useQuery({
    queryKey: ['hub-config'],
    queryFn: getHubConfig,
    staleTime: 5 * 60_000,
    retry: 1,
  })

  const hubUrl = (config.data?.hub_url || envHubUrl()).replace(/\/$/, '')
  const enabled = Boolean(config.data?.enabled ?? envHubUrl())
  const spawnUrl = hubUrl ? `${hubUrl}/hub/spawn` : ''

  return {
    hubUrl,
    spawnUrl,
    launchUrl: hubLaunchUrl(),
    enabled,
    isLoading: config.isLoading,
    isError: config.isError,
  }
}
