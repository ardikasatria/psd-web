'use client'

import { buildAssistantContext } from '@/lib/assistant/pageContext'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

export function useAssistantContext(): Record<string, string> {
  const pathname = usePathname()
  return useMemo(() => buildAssistantContext(pathname), [pathname])
}
