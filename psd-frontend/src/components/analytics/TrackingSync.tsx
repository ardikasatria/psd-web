'use client'

import { useEffect } from 'react'
import { getSettings } from '@/lib/api/settings'
import { initTracking, setTrackingEnabled } from '@/lib/analytics/track'
import { useAuth } from '@/lib/auth/useAuth'
import { useQuery } from '@tanstack/react-query'

/** Sinkronkan toggle pelacakan dari setelan privasi pengguna. */
export function TrackingSync() {
  const { isLoggedIn } = useAuth()

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    enabled: isLoggedIn,
    staleTime: 60_000,
    retry: false,
  })

  useEffect(() => {
    initTracking()
  }, [])

  useEffect(() => {
    if (!isLoggedIn) {
      setTrackingEnabled(true)
      return
    }
    if (data) {
      setTrackingEnabled(data.privacy.activity_tracking)
    }
  }, [isLoggedIn, data])

  return null
}
