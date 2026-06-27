'use client'

import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSettings, updateSettings } from '@/lib/api/settings'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import type { SettingsPatch } from '@/types/api'

export function useSettingsPage(redirect = '/settings') {
  useAuthGuard(redirect)

  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const query = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      qc.setQueryData(['settings'], data)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    },
  })

  const patch = useCallback(
    (body: SettingsPatch) => {
      mutation.mutate(body)
    },
    [mutation]
  )

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    patch,
    saved,
    isSaving: mutation.isPending,
  }
}
