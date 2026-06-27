'use client'

import { getMe } from '@/lib/api/auth'
import { useQuery } from '@tanstack/react-query'

export function useAuth() {
  const me = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false })
  return {
    user: me.data?.user,
    isLoggedIn: !!me.data?.user,
    isLoading: me.isLoading,
    isError: me.isError,
  }
}
