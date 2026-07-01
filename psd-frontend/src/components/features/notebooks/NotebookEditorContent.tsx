'use client'

import { ThemeToggle } from '@/components/common/ThemeToggle'
import { QueryState } from '@/components/features/QueryState'
import { NotebookEditor } from '@/components/features/notebooks/editor/NotebookEditor'
import { NotebookViewer } from '@/components/features/notebooks/editor/NotebookViewer'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { API_BASE, API_PREFIX, ApiError } from '@/lib/api/client'
import { getMyGamification } from '@/lib/api/gamification'
import { getNotebook, getNotebookContent, launchNotebook, stopRuntime } from '@/lib/api/notebooks'
import { kernelServerAvailable } from '@/lib/gamification/config'
import { hubTierFromGamificationLevel } from '@/lib/notebooks/tier'
import { useNotebookKernelAccess } from '@/lib/notebooks/useNotebookKernelAccess'
import { useAssetCollaboration } from '@/lib/teams/useAssetCollaboration'
import { profilePath } from '@/lib/routes/profile'
import type { IpyNb } from '@/lib/notebooks/ipynb'
import type { NotebookKernel } from '@/lib/notebooks/kernels/kernelInterface'
import { createHubServerKernel } from '@/lib/notebooks/kernels/serverKernel'
import { createPyodideKernel } from '@/lib/notebooks/kernels/pyodideKernel'
import { Button } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { ArrowLeftIcon, ArrowPathIcon, CpuChipIcon, PlayIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

type RuntimeMode = 'browser' | 'server'
type ServerSession = 'disconnected' | 'connecting' | 'connected' | 'disconnecting'

export function NotebookEditorContent({ id }: { id: string }) {
  useAuthGuard(`/login?next=/notebooks/${id}/workspace`)

  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('browser')
  const [browserKernel, setBrowserKernel] = useState<NotebookKernel | null>(null)
  const [serverKernel, setServerKernel] = useState<NotebookKernel | null>(null)
  const [serverSession, setServerSession] = useState<ServerSession>('disconnected')
  const [browserLoading, setBrowserLoading] = useState(true)
  const [kernelError, setKernelError] = useState<string | null>(null)
  const serverKernelRef = useRef<NotebookKernel | null>(null)
  serverKernelRef.current = serverKernel

  const meta = useQuery({
    queryKey: ['notebook', id],
    queryFn: () => getNotebook(id),
  })

  const { canEdit, isLoadingTeams } = useAssetCollaboration(meta.data?.team, meta.data?.owner.username)

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

  const disposeServerKernel = useCallback(() => {
    serverKernelRef.current?.dispose?.()
    setServerKernel(null)
  }, [])

  const initBrowserKernel = useCallback(async () => {
    setBrowserLoading(true)
    setKernelError(null)
    try {
      const k = await createPyodideKernel({ apiBase: `${API_BASE}${API_PREFIX}` })
      setBrowserKernel(k)
    } catch {
      setKernelError('Gagal memuat kernel Pyodide. Periksa koneksi lalu muat ulang halaman.')
    } finally {
      setBrowserLoading(false)
    }
  }, [])

  const mapServerError = useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      if (err.code === 'kernel_access_required') {
        return 'Akses kernel server belum tersedia. Ajukan akses kernel terlebih dahulu.'
      }
      if (err.code === 'kernel_limit') return err.message
      if (err.code === 'hub_disabled') return 'Kernel server belum diaktifkan di lingkungan ini.'
      if (err.code === 'hub_misconfigured') {
        return 'Konfigurasi JupyterHub belum benar (token service). Hubungi admin.'
      }
      if (err.code === 'hub_spawn_failed') return err.message
      if (err.code === 'hub_unavailable' || err.code === 'hub_timeout' || err.status === 504) {
        return 'Kernel server sedang disiapkan — tunggu 1–2 menit lalu coba lagi.'
      }
      if (err.code === 'hub_error' || err.status === 502) {
        return 'Kernel server sementara tidak tersedia. Coba lagi sebentar lagi.'
      }
      return err.message
    }
    return err instanceof Error ? err.message : 'Gagal menyambung ke kernel server.'
  }, [])

  const connectServer = useCallback(async () => {
    if (!canServer) return
    setServerSession('connecting')
    setKernelError(null)
    disposeServerKernel()
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
      setServerKernel(k)
      setServerSession('connected')
    } catch (err) {
      setKernelError(mapServerError(err))
      setServerSession('disconnected')
    }
  }, [canServer, disposeServerKernel, id, mapServerError])

  useEffect(() => {
    if (!canEdit) return
    void initBrowserKernel()
  }, [canEdit, initBrowserKernel])

  const switchRuntime = async (mode: RuntimeMode) => {
    if (mode === runtimeMode) return
    setKernelError(null)

    if (mode === 'browser') {
      if (serverSession === 'connected' || serverSession === 'disconnecting') {
        setServerSession('disconnecting')
        try {
          await stopRuntime(id)
        } catch {
          /* ignore */
        }
        disposeServerKernel()
      }
      setServerSession('disconnected')
      setRuntimeMode('browser')
      if (!browserKernel && !browserLoading) {
        await initBrowserKernel()
      }
      return
    }

    setRuntimeMode('server')
    if (serverSession !== 'connected' || !serverKernel) {
      await connectServer()
    }
  }

  const stopServer = async () => {
    setServerSession('disconnecting')
    setKernelError(null)
    disposeServerKernel()
    try {
      await stopRuntime(id)
    } catch {
      /* ignore — sesi lokal sudah diputus */
    } finally {
      setServerSession('disconnected')
    }
  }

  const activeKernel = runtimeMode === 'browser' ? browserKernel : serverKernel
  const showServerControls = runtimeMode === 'server' && canServer
  const showServerConnecting = runtimeMode === 'server' && serverSession === 'connecting'
  const showBrowserBoot = canEdit && runtimeMode === 'browser' && browserLoading && !browserKernel

  return (
    <QueryState
      isLoading={meta.isLoading || content.isLoading || isLoadingTeams}
      isError={meta.isError || content.isError}
      error={meta.error ?? content.error}
    >
      {meta.data && content.data && (
        <div className="min-h-full bg-white dark:bg-[#202124]">
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
                {!canEdit ? (
                  <>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      Mode baca
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      oleh{' '}
                      <Link
                        href={profilePath(meta.data.owner.username)}
                        className="font-medium text-violet-700 hover:underline dark:text-violet-300"
                      >
                        {meta.data.owner.username}
                      </Link>
                    </span>
                    <ThemeToggle className="!p-1.5" />
                  </>
                ) : (
                  <>
                {canServer ? (
                  <div className="inline-flex rounded-full border border-neutral-200 p-0.5 dark:border-neutral-700">
                    <button
                      type="button"
                      onClick={() => void switchRuntime('browser')}
                      disabled={serverSession === 'connecting' || serverSession === 'disconnecting'}
                      className={clsx(
                        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        runtimeMode === 'browser'
                          ? 'bg-violet-600 text-white'
                          : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800',
                      )}
                    >
                      Browser
                    </button>
                    <button
                      type="button"
                      onClick={() => void switchRuntime('server')}
                      disabled={serverSession === 'connecting' || serverSession === 'disconnecting'}
                      className={clsx(
                        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        runtimeMode === 'server'
                          ? 'bg-violet-600 text-white'
                          : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800',
                      )}
                    >
                      Server
                    </button>
                  </div>
                ) : (
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
                    Runtime browser
                  </span>
                )}

                {showServerControls && serverSession === 'connected' && (
                  <Button
                    outline
                    onClick={() => void stopServer()}
                    disabled={serverSession !== 'connected'}
                    className="!text-xs"
                  >
                    Hentikan kernel
                  </Button>
                )}

                {showServerControls && serverSession === 'disconnecting' && (
                  <Button outline disabled className="!text-xs">
                    <ArrowPathIcon className="size-4 animate-spin" aria-hidden />
                    Menghentikan…
                  </Button>
                )}

                {showServerControls && serverSession === 'disconnected' && (
                  <ButtonPrimary onClick={() => void connectServer()} className="!text-xs">
                    <PlayIcon className="size-4" aria-hidden />
                    Jalankan lagi
                  </ButtonPrimary>
                )}

                {showServerControls && serverSession === 'connecting' && (
                  <Button outline disabled className="!text-xs">
                    <ArrowPathIcon className="size-4 animate-spin" aria-hidden />
                    Menyalakan…
                  </Button>
                )}

                {!canServer && !pendingGrant && (
                  <ButtonPrimary href="/notebooks/kernel-request" className="!text-xs">
                    <CpuChipIcon className="size-4" aria-hidden />
                    Ajukan kernel
                  </ButtonPrimary>
                )}

                <ThemeToggle className="!p-1.5" />
                  </>
                )}
              </div>
            </div>
          </div>

          {canEdit && showServerConnecting && (
            <div className="border-b border-violet-200/80 bg-violet-50/80 px-4 py-4 text-center dark:border-violet-900/50 dark:bg-violet-950/30">
              <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                <div
                  className="size-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600"
                  aria-hidden
                />
                <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
                  Menyiapkan kernel server…
                </p>
                <p className="text-xs text-violet-700 dark:text-violet-300">
                  Menghubungkan ke lingkungan Python terisolasi — tetap di editor PSD.
                </p>
              </div>
            </div>
          )}

          {canEdit && runtimeMode === 'server' && serverSession === 'disconnected' && !kernelError && !showServerConnecting && (
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-center dark:border-neutral-800 dark:bg-neutral-900/60">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Kernel server terputus. Anda masih bisa mengedit sel; tekan{' '}
                <strong className="font-medium text-neutral-800 dark:text-neutral-200">Jalankan lagi</strong> untuk
                mengeksekusi kode.
              </p>
            </div>
          )}

          {canEdit && kernelError && (
            <div className="border-b border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/40">
              <p className="text-center text-sm text-red-700 dark:text-red-300">{kernelError}</p>
              {kernelError.includes('coba lagi') && canServer && runtimeMode === 'server' && (
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

          {!canEdit ? (
            <NotebookViewer title={meta.data.title} initialIpynb={content.data.content as IpyNb} />
          ) : showBrowserBoot ? (
            <p className="py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Memuat kernel browser…
            </p>
          ) : (
            <NotebookEditor
              title={meta.data.title}
              notebookId={id}
              initialIpynb={content.data.content as IpyNb}
              kernel={activeKernel}
              runtime={runtimeMode}
            />
          )}
        </div>
      )}
    </QueryState>
  )
}
