'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { initTracking, trackPageView } from '@/lib/analytics/track'

export function ActivityTracker() {
  const pathname = usePathname()
  const prev = useRef<string | null>(null)

  useEffect(() => {
    initTracking()
  }, [])

  useEffect(() => {
    if (!pathname || pathname === prev.current) return
    prev.current = pathname
    trackPageView(pathname)
  }, [pathname])

  return null
}
