'use client'

import { useAuth } from '@/lib/auth/useAuth'
import { isSuperadmin } from '@/lib/auth/roles'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useSuperadminGuard() {
  const router = useRouter()
  const { user, isLoggedIn, isLoading, isError } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!isLoggedIn || isError) {
      router.replace('/login?next=/admin/users')
      return
    }
    if (user && !isSuperadmin(user)) {
      router.replace('/403')
    }
  }, [user, isLoggedIn, isLoading, isError, router])

  return { user, isLoading, isError }
}
