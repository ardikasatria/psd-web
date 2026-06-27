'use client'

import { useAuth } from '@/lib/auth/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAuthGuard(next = '/dashboard') {
  const router = useRouter()
  const { isLoggedIn, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace(`/login?next=${encodeURIComponent(next)}`)
    }
  }, [isLoading, isLoggedIn, next, router])
}
