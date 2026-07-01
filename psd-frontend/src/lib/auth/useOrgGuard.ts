'use client'

import { useAuth } from '@/lib/auth/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Arahkan ke login bila belum masuk, atau ke dashboard bila bukan akun organisasi. */
export function useOrgGuard(next = '/me/org/teams') {
  const router = useRouter()
  const { user, isLoggedIn, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!isLoggedIn) {
      router.replace(`/login?next=${encodeURIComponent(next)}`)
      return
    }
    if (user?.account_type !== 'organization') {
      router.replace('/me/teams')
    }
  }, [isLoading, isLoggedIn, user?.account_type, next, router])

  return { user, isLoading, isOrg: user?.account_type === 'organization' }
}
