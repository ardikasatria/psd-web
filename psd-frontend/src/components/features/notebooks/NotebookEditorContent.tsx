'use client'

import { QueryState } from '@/components/features/QueryState'
import { NotebookEditor } from '@/components/features/notebooks/editor/NotebookEditor'
import { OpenHubButton } from '@/components/features/notebooks/OpenHubButton'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { API_BASE, API_PREFIX } from '@/lib/api/client'
import { getMyGamification } from '@/lib/api/gamification'
import { getNotebook, getNotebookContent, launchNotebook } from '@/lib/api/notebooks'
import { kernelServerAvailable } from '@/lib/gamification/config'
import { hubTierFromGamificationLevel } from '@/lib/notebooks/tier'
import type { IpyNb } from '@/lib/notebooks/ipynb'
import type { NotebookKernel } from '@/lib/notebooks/kernels/kernelInterface'
import { createPyodideKernel } from '@/lib/notebooks/kernels/pyodideKernel'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function NotebookEditorContent({ id }: { id: string }) {
  useAuthGuard(`/login?next=/notebooks/${id}/workspace`)
  const [launching, setLaunching] = useState(false)
  const [kernel, setKernel] = useState<NotebookKernel | null>(null)
  const [kernelError, setKernelError] = useState<string | null>(null)

  const meta = useQuery({
    queryKey: ['notebook', id],
    queryFn: () => getNotebook(id),
  })

  const content = useQuery({
    queryKey: ['notebook', id, 'content'],
    queryFn: () => getNotebookContent(id),
    enabled: !!meta.data,
  })

  const gamification = useQuery({
    queryKey: ['me', 'gamification'],
    queryFn: getMyGamification,
  })

  const tierSlug = hubTierFromGamificationLevel(gamification.data?.tier.level ?? 0)
  const canServer = kernelServerAvailable(tierSlug)

  useEffect(() => {
    let cancelled = false
    createPyodideKernel({ apiBase: `${API_BASE}${API_PREFIX}` })
      .then((k) => {
        if (!cancelled) setKernel(k)
      })
      .catch(() => {
        if (!cancelled) setKernelError('Gagal memuat kernel Pyodide. Periksa koneksi lalu muat ulang halaman.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openServer = async () => {
    setLaunching(true)
    try {
      const out = await launchNotebook(id, 'server')
      if (out.hub_url) {
        const url = `${out.hub_url}${out.spawn_path ?? '/hub/spawn'}`
        window.location.href = url
      }
    } finally {
      setLaunching(false)
    }
  }

  return (
    <QueryState
      isLoading={meta.isLoading || content.isLoading}
      isError={meta.isError || content.isError}
      error={meta.error ?? content.error}
    >
      {meta.data && content.data && (
        <div className="min-h-screen bg-white dark:bg-[#202124]">
          <div className="border-b border-neutral-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
              <Link
                href={`/notebooks/${id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-violet-700 dark:text-neutral-400 dark:hover:text-violet-300"
              >
                <ArrowLeftIcon className="size-4" aria-hidden />
                Detail notebook
              </Link>
              {canServer && (
                <div className="flex items-center gap-2">
                  <Badge color="violet">Kernel server</Badge>
                  <ButtonPrimary onClick={() => void openServer()} disabled={launching}>
                    {launching ? 'Membuka…' : 'Buka kernel server'}
                  </ButtonPrimary>
                  <OpenHubButton compact plain />
                </div>
              )}
            </div>
          </div>

          {kernelError && (
            <p className="bg-red-50 px-4 py-3 text-center text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {kernelError}
            </p>
          )}

          {kernel && (
            <NotebookEditor
              title={meta.data.title}
              notebookId={id}
              initialIpynb={content.data.content as IpyNb}
              kernel={kernel}
              runtime="browser"
            />
          )}

          {!kernel && !kernelError && (
            <p className="py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Memuat kernel browser…
            </p>
          )}
        </div>
      )}
    </QueryState>
  )
}
