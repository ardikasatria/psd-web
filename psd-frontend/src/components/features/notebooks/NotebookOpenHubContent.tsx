'use client'

import { hubLaunchUrl } from '@/lib/api/hub'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { useEffect } from 'react'

export function NotebookOpenHubContent() {
  useAuthGuard(`/login?next=${encodeURIComponent('/notebooks/open')}`)

  useEffect(() => {
    window.location.href = hubLaunchUrl()
  }, [])

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="size-10 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" aria-hidden />
      <h1 className="mt-6 text-xl font-semibold text-neutral-900 dark:text-neutral-50">Membuka Jupyter Notebook…</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Login PSD Anda akan diteruskan ke JupyterHub secara otomatis.
      </p>
    </div>
  )
}
