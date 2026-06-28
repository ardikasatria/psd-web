'use client'

import { fetchGuestToken } from '@/lib/api/bi'
import { embedDashboard } from '@superset-ui/embedded-sdk'
import { useEffect, useRef } from 'react'

export function EmbeddedDashboard({ dashboardKey }: { dashboardKey: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    let mounted = true

    ;(async () => {
      const init = await fetchGuestToken(dashboardKey)
      if (!mounted || !ref.current) return

      await embedDashboard({
        id: init.uuid,
        supersetDomain: init.supersetDomain,
        mountPoint: ref.current,
        fetchGuestToken: async () => {
          const r = await fetchGuestToken(dashboardKey)
          return r.token
        },
        dashboardUiConfig: { hideTitle: false, filters: { expanded: true } },
      })
    })().catch(() => {
      /* error ditampilkan via UI kosong; caller bisa tambah toast */
    })

    return () => {
      mounted = false
    }
  }, [dashboardKey])

  return <div ref={ref} className="min-h-[70vh] w-full rounded-2xl border border-neutral-200 dark:border-neutral-700" />
}
