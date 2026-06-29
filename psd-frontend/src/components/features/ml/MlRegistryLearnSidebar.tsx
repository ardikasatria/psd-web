'use client'

import {
  SidebarStatTile,
  sidebarCalloutClass,
  sidebarSectionClass,
  sidebarTipClass,
} from '@/components/common/SidebarStatTile'
import { getServingQuota } from '@/lib/api/serving'
import { useAuth } from '@/lib/auth/useAuth'
import type { ModelRegistrySummary } from '@/lib/api/ml'
import {
  ArrowRightIcon,
  BeakerIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  CubeIcon,
  PlusIcon,
  RectangleStackIcon,
  SignalIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

const REGISTRY_TIPS = [
  'Hubungkan registry ke repo model (repo_id) agar versi MLflow terikat ke artefak di katalog PSD.',
  'Jalankan drift check secara berkala setelah data produksi berubah — PSI > 0.25 biasanya perlu retrain.',
  'Serving endpoint memakai kuota tier — pantau sisa prediksi per jam di halaman registry.',
  'Daftarkan versi baru setelah setiap eksperimen penting; bandingkan metrik di detail registry.',
]

type Props = {
  className?: string
  items?: ModelRegistrySummary[]
  onScrollToCatalog?: () => void
  onCreateRegistry?: () => void
}

export function MlRegistryLearnSidebar({
  className,
  items = [],
  onScrollToCatalog,
  onCreateRegistry,
}: Props) {
  const { isLoggedIn } = useAuth()
  const tip = REGISTRY_TIPS[new Date().getDate() % REGISTRY_TIPS.length]

  const quota = useQuery({
    queryKey: ['serving-quota'],
    queryFn: getServingQuota,
    enabled: isLoggedIn,
    staleTime: 60_000,
  })

  const withRepo = items.filter((r) => r.repo_id)
  const withMonitoring = items.filter((r) => r.monitoring_dashboard_id)

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-2 gap-2">
        <SidebarStatTile
          label="Registry"
          value={items.length}
          icon={<RectangleStackIcon className="size-4" />}
          accent="violet"
        />
        <SidebarStatTile
          label="Terhubung repo"
          value={withRepo.length}
          icon={<CubeIcon className="size-4" />}
          accent="indigo"
        />
        <SidebarStatTile
          label="Monitoring"
          value={withMonitoring.length}
          icon={<ChartBarIcon className="size-4" />}
          accent="sky"
        />
        <SidebarStatTile
          label="Kuota/jam"
          value={
            quota.data
              ? `${quota.data.remaining}/${quota.data.limit}`
              : isLoggedIn
                ? '…'
                : '—'
          }
          icon={<SignalIcon className="size-4" />}
          accent="primary"
        />
      </div>

      {quota.data && (
        <section className={sidebarCalloutClass}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <SignalIcon className="size-4 text-violet-600 dark:text-violet-400" />
            Kuota serving
          </h3>
          <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            Tier <strong className="text-neutral-800 dark:text-neutral-200">{quota.data.tier}</strong> —{' '}
            {quota.data.used} dipakai, {quota.data.remaining} prediksi tersisa per jam.
          </p>
        </section>
      )}

      <section className={sidebarSectionClass}>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <CloudArrowUpIcon className="size-4 text-primary-500" />
          Jalur registry
        </h3>
        <ol className="mt-3 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
              1
            </span>
            Publikasikan model ke katalog
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              2
            </span>
            Buat registry MLflow
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
              3
            </span>
            Daftarkan versi & metrik
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
              4
            </span>
            Pantau drift & serving
          </li>
        </ol>
        {onScrollToCatalog && (
          <button
            type="button"
            onClick={onScrollToCatalog}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Lihat registry saya
            <ArrowRightIcon className="size-3.5" aria-hidden />
          </button>
        )}
      </section>

      <section className={sidebarSectionClass}>
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Hubungkan ekosistem</h3>
        <nav className="mt-2 space-y-1">
          <Link
            href="/models"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300"
          >
            <BeakerIcon className="size-4" />
            Katalog model
          </Link>
          <Link
            href="/notebooks"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300"
          >
            <SparklesIcon className="size-4" />
            Notebook
          </Link>
          <Link
            href="/datasets"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300"
          >
            <CubeIcon className="size-4" />
            Dataset
          </Link>
          <Link
            href="/competitions"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300"
          >
            <ChartBarIcon className="size-4" />
            Kompetisi
          </Link>
        </nav>
      </section>

      <section className={sidebarTipClass}>
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-800 dark:text-neutral-100">
          <SparklesIcon className="size-4" aria-hidden />
          Tips registry
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">{tip}</p>
      </section>

      {isLoggedIn ? (
        <button
          type="button"
          onClick={onCreateRegistry}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <PlusIcon className="size-4" aria-hidden />
          Registry baru
        </button>
      ) : (
        <Link
          href="/login?next=/ml"
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Masuk untuk registry
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      )}
    </aside>
  )
}
