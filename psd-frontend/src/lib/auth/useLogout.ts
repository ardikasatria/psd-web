'use client'

import { logout } from '@/lib/api/auth'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

export function useLogout(redirectTo = '/') {
  const queryClient = useQueryClient()

  return useCallback(async () => {
    try {
      await logout()
    } catch {
      // tetap bersihkan state lokal meski request gagal
    }
    queryClient.clear()
    window.location.assign(redirectTo)
  }, [queryClient, redirectTo])
}
