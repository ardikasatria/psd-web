'use client'

import { CookieNotice } from '@/components/common/CookieNotice'
import { ToastProvider } from '@/components/common/Toast'
import { ActivityTracker } from '@/components/analytics/ActivityTracker'
import { TrackingSync } from '@/components/analytics/TrackingSync'
import { getQueryClient } from '@/lib/query'
import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { OnboardingWelcome } from '@/components/features/onboarding/OnboardingWelcome'
import { TosReacceptBanner } from '@/components/features/legal/TosReacceptBanner'
import { SettingsSync } from '@/components/features/settings/SettingsSync'
import { MswProvider } from './MswProvider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient())

  return (
    <MswProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
          <ActivityTracker />
          <TrackingSync />
          <SettingsSync />
          <OnboardingWelcome />
          <TosReacceptBanner />
          <CookieNotice />
        </ToastProvider>
      </QueryClientProvider>
    </MswProvider>
  )
}
