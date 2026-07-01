'use client'

import { SidebarStatTile, sidebarCalloutClass, sidebarSectionClass, sidebarTipClass } from '@/components/common/SidebarStatTile'
import { harvestGradient } from '@/components/common/featureGradients'
import { listJobs, type HarvestJob } from '@/lib/api/harvest'
import { isActiveHarvestStatus, timeAgoHarvest } from '@/components/features/harvest/harvest-utils'
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  ChartBarSquareIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

const HARVEST_TIPS = [
  'Gunakan rate limit yang wajar — hormati ToS dan kapasitas server sumber.',
  'Uji records_path dengan Pratinjau sebelum menjalankan panen penuh.',
  'Hasil panen langsung jadi dataset — bisa dilanjutkan ke Pabrik Data untuk ETL.',
  'Rahasia auth disimpan di vault dan tidak pernah ditampilkan ulang.',
  'Hanya domain dalam allowlist yang bisa dipanen — hubungi admin jika perlu penambahan.',
]

const FLOW_STEPS = [
  { label: 'Panen API', href: '/harvest', active: true },
  { label: 'Dataset', href: '/datasets' },
  { label: 'Pabrik Data', href: '/factory/pipelines' },
  { label: 'Analitik', href: '/analytics' },
]

type Props = {
  className?: string
  onCreateClick?: () => void
}

export function HarvestSidebar({ className, onCreateClick }: Props) {
  const tip = HARVEST_TIPS[new Date().getDate() % HARVEST_TIPS.length]

  const jobs = useQuery({
    queryKey: ['harvest-jobs'],
    queryFn: listJobs,
    staleTime: 15_000,
    refetchInterval: (q) => {
      const items = q.state.data ?? []
      return items.some((j: HarvestJob) => isActiveHarvestStatus(j.status)) ? 2000 : false
    },
  })

  const items = jobs.data ?? []
  const running = items.filter((j) => isActiveHarvestStatus(j.status)).length
  const completed = items.filter((j) => j.status === 'completed').length
  const failed = items.filter((j) => j.status === 'failed').length
  const totalRecords = items.reduce((n, j) => n + j.records_written, 0)
  const recent = items.slice(0, 3)

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className={harvestGradient.sidebarAccent}>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow">
            <ArrowDownTrayIcon className="size-4" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              Ruang Panen
            </p>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">API → Dataset</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SidebarStatTile
          label="Job aktif"
          value={running}
          icon={<SparklesIcon className="size-4" />}
          accent="emerald"
        />
        <SidebarStatTile
          label="Selesai"
          value={completed}
          icon={<CircleStackIcon className="size-4" />}
          accent="sky"
        />
        <SidebarStatTile
          label="Gagal"
          value={failed}
          icon={<GlobeAltIcon className="size-4" />}
          accent="amber"
        />
        <SidebarStatTile
          label="Record"
          value={totalRecords > 999 ? `${(totalRecords / 1000).toFixed(1)}k` : totalRecords}
          icon={<ArrowDownTrayIcon className="size-4" />}
          accent="primary"
        />
      </div>

      {running > 0 && (
        <div className={sidebarSectionClass}>
          <div className="mb-2 flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              {running} job berjalan
            </span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Progres diperbarui otomatis. Hasil akan tersedia sebagai dataset saat selesai.
          </p>
        </div>
      )}

      {recent.length > 0 && (
        <div className={sidebarSectionClass}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Job terbaru
          </p>
          <ul className="space-y-2">
            {recent.map((j) => (
              <li
                key={j.id}
                className="rounded-xl border border-neutral-100 bg-neutral-50/80 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/50"
              >
                <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{j.name}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {j.status}
                  {j.created_at && ` · ${timeAgoHarvest(j.created_at)}`}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={sidebarSectionClass}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Alur data
        </p>
        <ol className="flex flex-wrap items-center gap-1 text-xs">
          {FLOW_STEPS.map((s, i) => (
            <li key={s.label} className="flex items-center gap-1">
              {i > 0 && <ArrowRightIcon className="size-3 text-neutral-300 dark:text-neutral-600" />}
              <Link
                href={s.href}
                className={clsx(
                  'rounded-lg px-2 py-1 font-medium transition',
                  s.active
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800',
                )}
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ol>
      </div>

      <div className={sidebarCalloutClass}>
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <ShieldCheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          Etika & keamanan
        </div>
        <p className={sidebarTipClass}>
          Panen hanya sumber yang Anda punya hak/izin aksesnya. Hormati ToS & rate limit. Domain di luar
          allowlist perlu persetujuan admin.
        </p>
      </div>

      <div className={sidebarCalloutClass}>
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <SparklesIcon className="size-4 text-primary-600 dark:text-primary-400" aria-hidden />
          Tips panen
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{tip}</p>
      </div>

      <Link
        href="/datasets"
        className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-emerald-200 hover:text-emerald-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-emerald-800"
      >
        Lihat dataset
        <CircleStackIcon className="size-4" aria-hidden />
      </Link>

      <Link
        href="/factory/pipelines"
        className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-emerald-200 hover:text-emerald-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-emerald-800"
      >
        Pabrik Data
        <Cog6ToothIcon className="size-4" aria-hidden />
      </Link>

      <Link
        href="/analytics"
        className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-primary-200 hover:text-primary-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-primary-800"
      >
        Ruang Analitik
        <ChartBarSquareIcon className="size-4" aria-hidden />
      </Link>

      {onCreateClick && (
        <button
          type="button"
          onClick={onCreateClick}
          className="w-full rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-3 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
        >
          + Job panen baru
        </button>
      )}
    </aside>
  )
}
