'use client'

import { OpenHubButton } from '@/components/features/notebooks/OpenHubButton'
import { NotebookQuotaPanel } from '@/components/features/notebooks/NotebookQuotaPanel'
import { FeaturePageShell } from '@/components/features/layout'
import { heroGradient } from '@/components/common/featureGradients'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { getMyGamification } from '@/lib/api/gamification'
import { hubTierFromGamificationLevel } from '@/lib/notebooks/tier'
import { notebookLimitsFor } from '@/lib/notebooks/policy'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  BeakerIcon,
  CloudIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

export function NotebookWorkspaceContent() {
  useAuthGuard('/login?next=/notebooks/workspace')

  const gamification = useQuery({
    queryKey: ['me', 'gamification'],
    queryFn: getMyGamification,
  })

  const tierKey = hubTierFromGamificationLevel(gamification.data?.tier.level ?? 0)
  const limits = notebookLimitsFor(tierKey)
  const canServer = limits.runtime === 'server' || limits.runtime === 'both'
  const browserOnly = limits.runtime === 'browser'

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

        <div className="grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl border border-sky-200/80 bg-gradient-to-br from-sky-50/80 to-white p-6 dark:border-sky-900/40 dark:from-sky-950/20 dark:to-neutral-900">
            <div className="flex items-start justify-between gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 text-white">
                <GlobeAltIcon className="size-5" aria-hidden />
              </div>
              <Badge color="sky">Tier pemula</Badge>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Runtime browser</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              JupyterLite + Pyodide di browser — biaya server ~nol, instan untuk latihan ringan. SDK{' '}
              <code className="rounded bg-white/80 px-1 dark:bg-neutral-800">psd-lite</code> memuat dataset via presigned
              URL.
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
            <ButtonPrimary disabled className="mt-5 w-full justify-center opacity-80">
              Editor browser — segera
            </ButtonPrimary>
            {browserOnly && (
              <p className="mt-2 text-center text-xs text-sky-800 dark:text-sky-300">
                Tier Anda saat ini: browser-only. Naikkan tier untuk kernel server.
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
              {canServer ? <Badge color="violet">Menengah+</Badge> : <Badge color="zinc">Terkunci</Badge>}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Kernel server</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Kontainer terisolasi per pengguna — akses penuh <code className="rounded bg-white/80 px-1 dark:bg-neutral-800">psd</code>{' '}
              SDK, idle-culling, login OAuth PSD otomatis.
            </p>
            {canServer ? (
              <>
                <div className="mt-4">
                  <OpenHubButton className="[&_a]:w-full [&_button]:w-full" />
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  Membuka kernel via JupyterHub di belakang layar — UI Hub disembunyikan setelah OAuth.
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-amber-800 dark:text-amber-300">
                Kernel server tersedia dari tier Menengah. Kumpulkan reputasi di{' '}
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
