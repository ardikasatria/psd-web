'use client'

import { AssistantFab } from '@/components/features/assistant/AssistantFab'
import { shouldHideAssistant } from '@/lib/assistant/pageContext'
import { useAuth } from '@/lib/auth/useAuth'
import { usePathname } from 'next/navigation'

export function AssistantShell() {
  const pathname = usePathname()
  const { isLoggedIn } = useAuth()

  if (!isLoggedIn || shouldHideAssistant(pathname)) {
    return null
  }

  return <AssistantFab />
}
