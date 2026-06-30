'use client'

import { NotebookQuotaPanel } from '@/components/features/notebooks/NotebookQuotaPanel'
import { FeaturePageShell } from '@/components/features/layout'
import { heroGradient } from '@/components/common/featureGradients'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { createNotebook, getNotebookUsage, getNotebooks } from '@/lib/api/notebooks'
import { getMyGamification } from '@/lib/api/gamification'
import { kernelServerAvailable } from '@/lib/gamification/config'
import { hubTierFromGamificationLevel } from '@/lib/notebooks/tier'
import { useNotebookKernelAccess } from '@/lib/notebooks/useNotebookKernelAccess'
import { notebookLimitsFor } from '@/lib/notebooks/policy'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import {
  BeakerIcon,
  CloudIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  GlobeAltIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function NotebookWorkspaceContent() {
  useAuthGuard('/login?next=/notebooks/workspace')
  const router = useRouter()
  const qc = useQueryClient()
  const [newTitle, setNewTitle] = useState('')

  const gamification = useQuery({
    queryKey: ['me', 'gamification'],
    queryFn: getMyGamification,
  })

  const usage = useQuery({
    queryKey: ['notebooks', 'me', 'usage'],
    queryFn: getNotebookUsage,
  })

  const mine = useQuery({
    queryKey: ['notebooks', 'mine'],
    queryFn: () => getNotebooks({ page_size: 20, mine: true }),
  })

  const tierKey = hubTierFromGamificationLevel(gamification.data?.tier.level ?? 0)
  const limits = notebookLimitsFor(tierKey)
  const { canServer: canServerGrant } = useNotebookKernelAccess()
  const canServer = kernelServerAvailable(tierKey) || canServerGrant
  const browserOnly = limits.runtime === 'browser'

  const create = useMutation({
    mutationFn: (title: string) =>
      createNotebook({ title, description: '', tags: [] }),
    onSuccess: (nb) => {
      qc.invalidateQueries({ queryKey: ['notebooks'] })
      qc.invalidateQueries({ queryKey: ['notebooks', 'me', 'usage'] })
      router.push(`/notebooks/${nb.id}/workspace`)
    },
  })

  const owned = usage.data?.owned ?? 0
  const maxNb = usage.data?.limits.max_notebooks ?? limits.maxNotebooks
  const atQuota = owned >= maxNb

  return (
    <FeaturePageShell>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <div className={heroGradient.notebook}>
          <div className="relative z-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">
              <CodeBracketSquareIcon className="size-3.5" aria-hidden />
              Notebook terintegrasi
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Workspace notebook</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Jalankan notebook <strong>langsung di PSD</strong> — gaya Kaggle, tanpa UI JupyterHub. Tier rendah memakai
              runtime browser (JupyterLite); tier lebih tinggi dapat kernel server terisolasi.
            </p>
          </div>
        </div>

        <NotebookQuotaPanel />

        <section className="rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Notebook saya</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {owned} / {maxNb} notebook · autosave ke PSD
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Judul notebook baru…"
              className="min-w-[200px] flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            <ButtonPrimary
              disabled={!newTitle.trim() || atQuota || create.isPending}
              onClick={() => create.mutate(newTitle.trim())}
            >
              <PlusIcon className="size-4" data-slot="icon" />
              {create.isPending ? 'Membuat…' : 'Notebook baru'}
            </ButtonPrimary>
          </div>
          {atQuota && (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              Kuota notebook tier Anda penuh. Naikkan tier di leaderboard untuk menambah.
            </p>
          )}

          <ul className="mt-5 divide-y divide-neutral-100 dark:divide-neutral-800">
            {(mine.data?.items ?? []).map((nb) => (
              <li key={nb.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{nb.title}</p>
                  <p className="text-xs text-neutral-500">{nb.id}</p>
                </div>
                <Button href={`/notebooks/${nb.id}/workspace`} outline>
                  Buka editor
                </Button>
              </li>
            ))}
            {!mine.isLoading && !(mine.data?.items?.length) && (
              <li className="py-6 text-center text-sm text-neutral-500">Belum ada notebook — buat yang pertama di atas.</li>
            )}
          </ul>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl border border-sky-200/80 bg-gradient-to-br from-sky-50/80 to-white p-6 dark:border-sky-900/40 dark:from-sky-950/20 dark:to-neutral-900">
            <div className="flex items-start justify-between gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 text-white">
                <GlobeAltIcon className="size-5" aria-hidden />
              </div>
              <Badge color="sky">Browser</Badge>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Runtime browser</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              JupyterLite + Pyodide di browser — biaya server ~nol, instan untuk latihan ringan.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
              <li className="flex gap-2">
                <BeakerIcon className="mt-0.5 size-4 shrink-0 text-sky-600" aria-hidden />
                Paket Python terbatas (Pyodide) — analisis berat gunakan kernel server.
              </li>
              <li className="flex gap-2">
                <CloudIcon className="mt-0.5 size-4 shrink-0 text-sky-600" aria-hidden />
                Autosave notebook ke PSD via API.
              </li>
            </ul>
            {browserOnly && (
              <p className="mt-4 text-xs text-sky-800 dark:text-sky-300">
                Tier Anda: browser-only. Naikkan tier untuk kernel server.
              </p>
            )}
          </article>

          <article
            className={`rounded-3xl border p-6 ${
              canServer
                ? 'border-violet-200/80 bg-gradient-to-br from-violet-50/80 to-indigo-50/60 dark:border-violet-900/40 dark:from-violet-950/25 dark:to-indigo-950/20'
                : 'border-neutral-200/80 bg-neutral-50/50 opacity-75 dark:border-neutral-700 dark:bg-neutral-900/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                <CpuChipIcon className="size-5" aria-hidden />
              </div>
              {canServer ? <Badge color="violet">Tersedia</Badge> : <Badge color="zinc">Terkunci</Badge>}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Kernel server</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Python penuh di server terisolasi — dihubungkan langsung dari editor PSD, tanpa membuka antarmuka terpisah.
            </p>
            {canServer ? (
              <p className="mt-4 text-sm text-violet-800 dark:text-violet-200">
                Buka notebook di bawah, lalu pilih tab <strong>Server</strong> di toolbar editor.
              </p>
            ) : (
              <p className="mt-4 text-sm text-amber-800 dark:text-amber-300">
                Kernel server tersedia dari tier Ahli atau setelah pengajuan disetujui.{' '}
                <Link href="/notebooks/kernel-request" className="font-medium underline">
                  Ajukan akses
                </Link>
                {' '}atau kumpulkan reputasi di{' '}
                <Link href="/leaderboard" className="font-medium underline">
                  leaderboard
                </Link>
                .
              </p>
            )}
          </article>
        </div>

        <p className="text-center text-sm text-neutral-500">
          <Link href="/notebooks" className="font-medium text-violet-700 hover:underline dark:text-violet-300">
            ← Kembali ke katalog notebook
          </Link>
        </p>
      </div>
    </FeaturePageShell>
  )
}
