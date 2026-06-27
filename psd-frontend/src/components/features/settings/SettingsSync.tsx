'use client'

import { useContext, useEffect } from 'react'
import { getSettings } from '@/lib/api/settings'
import { applyAppearanceSettings, initReducedMotionFromOs } from '@/lib/settings/appearance'
import { useAuth } from '@/lib/auth/useAuth'
import { ThemeContext } from '@/app/theme-provider'
import { useQuery } from '@tanstack/react-query'

export function SettingsSync() {
  const { isLoggedIn } = useAuth()
  const theme = useContext(ThemeContext)

  useEffect(() => {
    initReducedMotionFromOs()
  }, [])

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    enabled: isLoggedIn,
    staleTime: 60_000,
    retry: false,
  })

  useEffect(() => {
    if (!data || !theme) return
    applyAppearanceSettings(data.appearance, theme.setThemeMode)
  }, [data, theme])

  return null
}
