'use client'

import { QueryState } from '@/components/features/QueryState'
import { NotebookEditor } from '@/components/features/notebooks/editor/NotebookEditor'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { API_BASE, API_PREFIX, ApiError } from '@/lib/api/client'
import { getMyGamification } from '@/lib/api/gamification'
import { getNotebook, getNotebookContent, launchNotebook, stopRuntime } from '@/lib/api/notebooks'
import { kernelServerAvailable } from '@/lib/gamification/config'
import { hubTierFromGamificationLevel } from '@/lib/notebooks/tier'
import { useNotebookKernelAccess } from '@/lib/notebooks/useNotebookKernelAccess'
import type { IpyNb } from '@/lib/notebooks/ipynb'
import type { NotebookKernel } from '@/lib/notebooks/kernels/kernelInterface'
import { createHubServerKernel } from '@/lib/notebooks/kernels/serverKernel'
import { createPyodideKernel } from '@/lib/notebooks/kernels/pyodideKernel'
import { Button } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { ArrowLeftIcon, CpuChipIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type RuntimeMode = 'browser' | 'server'

export function NotebookEditorContent({ id }: { id: string }) {
  useAuthGuard(`/login?next=/notebooks/${id}/workspace`)

  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('browser')
  const [preparing, setPreparing] = useState(false)
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
  const { canServer: canServerGrant, pendingGrant } = useNotebookKernelAccess()
  const canServer = kernelServerAvailable(tierSlug) || canServerGrant

  const initBrowserKernel = useCallback(async () => {
    setKernelError(null)
    try {
      const k = await createPyodideKernel({ apiBase: `${API_BASE}${API_PREFIX}` })
      setKernel(k)
    } catch {
      setKernelError('Gagal memuat kernel Pyodide. Periksa koneksi lalu muat ulang halaman.')
    }
  }, [])

  const connectServer = useCallback(async () => {
    if (!canServer) return
    setPreparing(true)
    setKernelError(null)
    setKernel(null)
    try {
      const out = await launchNotebook(id, 'server')
      if (out.runtime !== 'server' || out.provider !== 'jupyterhub') {
        throw new Error('Respons runtime server tidak valid')
      }
      if (!out.kernels_url || !out.ws_base || !out.token) {
        throw new Error('Konfigurasi kernel server tidak lengkap')
      }
      const k = await createHubServerKernel({
        kernelsUrl: out.kernels_url,
        wsBase: out.ws_base,
        token: out.token,
      })
      setKernel(k)
      setRuntimeMode('server')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'kernel_access_required') {
          setKernelError('Akses kernel server belum tersedia. Ajukan akses kernel terlebih dahulu.')
        } else if (err.code === 'kernel_limit') {
          setKernelError(err.message)
        } else if (err.code === 'hub_disabled') {
          setKernelError('Kernel server belum diaktifkan di lingkungan ini.')
        } else if (err.code === 'hub_misconfigured') {
          setKernelError('Konfigurasi JupyterHub belum benar (token service). Hubungi admin.')
        } else if (err.code === 'hub_unavailable' || err.code === 'hub_timeout' || err.status === 504) {
          setKernelError('Kernel server sedang disiapkan — tunggu 1–2 menit lalu coba lagi.')
        } else if (err.code === 'hub_error' || err.status === 502) {
          setKernelError('Kernel server sementara tidak tersedia. Coba lagi sebentar lagi.')
        } else {
          setKernelError(err.message)
        }
      } else {
        setKernelError(err instanceof Error ? err.message : 'Gagal menyambung ke kernel server.')
      }
      setRuntimeMode('browser')
      await initBrowserKernel()
    } finally {
      setPreparing(false)
    }
  }, [canServer, id, initBrowserKernel])

  useEffect(() => {
    void initBrowserKernel()
  }, [initBrowserKernel])

  const switchRuntime = async (mode: RuntimeMode) => {
    if (mode === runtimeMode) return
    if (mode === 'browser') {
      if (runtimeMode === 'server') {
        try {
          await stopRuntime(id)
        } catch {
          /* ignore */
        }
      }
      setRuntimeMode('browser')
      setKernel(null)
      await initBrowserKernel()
      return
    }
    await connectServer()
  }

  const stopServer = async () => {
    try {
      await stopRuntime(id)
    } finally {
      setRuntimeMode('browser')
      setKernel(null)
      await initBrowserKernel()
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
            <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
              <Link
                href={`/notebooks/${id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-violet-700 dark:text-neutral-400 dark:hover:text-violet-300"
              >
                <ArrowLeftIcon className="size-4" aria-hidden />
                Detail notebook
              </Link>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-full border border-neutral-200 p-0.5 dark:border-neutral-700">
                  <button
                    type="button"
                    onClick={() => void switchRuntime('browser')}
                    className={clsx(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      runtimeMode === 'browser'
                        ? 'bg-violet-600 text-white'
                        : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                    )}
                  >
                    Browser
                  </button>
                  <button
                    type="button"
                    onClick={() => void switchRuntime('server')}
                    disabled={!canServer || preparing}
                    className={clsx(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      runtimeMode === 'server'
                        ? 'bg-violet-600 text-white'
                        : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800',
                      !canServer && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    Server
                  </button>
                </div>
                {runtimeMode === 'server' && (
                  <Button outline onClick={() => void stopServer()} className="!text-xs">
                    Hentikan kernel
                  </Button>
                )}
                {!canServer && !pendingGrant && (
                  <ButtonPrimary href="/notebooks/kernel-request" className="!text-xs">
                    <CpuChipIcon className="size-4" aria-hidden />
                    Ajukan kernel
                  </ButtonPrimary>
                )}
              </div>
            </div>
          </div>

          {(preparing || (runtimeMode === 'server' && !kernel && !kernelError)) && (
            <div className="border-b border-violet-200/80 bg-violet-50/80 px-4 py-4 text-center dark:border-violet-900/50 dark:bg-violet-950/30">
              <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                <div className="size-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" aria-hidden />
                <p className="text-sm font-medium text-violet-900 dark:text-violet-100">Menyiapkan kernel server…</p>
                <p className="text-xs text-violet-700 dark:text-violet-300">
                  Menghubungkan ke lingkungan Python terisolasi — tetap di editor PSD.
                </p>
              </div>
            </div>
          )}

          {kernelError && (
            <div className="border-b border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/40">
              <p className="text-center text-sm text-red-700 dark:text-red-300">{kernelError}</p>
              {kernelError.includes('coba lagi') && canServer && (
                <div className="mt-2 text-center">
                  <Button outline onClick={() => void connectServer()}>
                    Coba lagi
                  </Button>
                </div>
              )}
              {kernelError.includes('Ajukan') && (
                <div className="mt-2 text-center">
                  <ButtonPrimary href="/notebooks/kernel-request">Ajukan akses kernel</ButtonPrimary>
                </div>
              )}
            </div>
          )}

          {kernel && (
            <NotebookEditor
              title={meta.data.title}
              notebookId={id}
              initialIpynb={content.data.content as IpyNb}
              kernel={kernel}
              runtime={runtimeMode}
            />
          )}

          {!kernel && !kernelError && !preparing && runtimeMode === 'browser' && (
            <p className="py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Memuat kernel browser…
            </p>
          )}
        </div>
      )}
    </QueryState>
  )
}
