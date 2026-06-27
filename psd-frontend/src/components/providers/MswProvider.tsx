'use client'

import { useEffect, useState } from 'react'

export function MswProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(process.env.NEXT_PUBLIC_USE_MOCKS !== 'true')

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCKS !== 'true') return

    async function enableMsw() {
      const { worker } = await import('@/lib/mocks/browser')
      await worker.start({ onUnhandledRequest: 'bypass' })
      setReady(true)
    }

    enableMsw()
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
        <p className="text-neutral-600 dark:text-neutral-400">Memuat data demo...</p>
      </div>
    )
  }

  return <>{children}</>
}
