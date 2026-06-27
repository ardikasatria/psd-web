'use client'

import { SidebarStatTile, sidebarCalloutClass, sidebarTipClass } from '@/components/common/SidebarStatTile'
import { listDashboards } from '@/lib/api/dashboards'
import { listPipelines } from '@/lib/api/factory'
import type { DashboardSummary } from '@/types/api'
import {
  ArrowRightIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  LockClosedIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

const ANALYTICS_TIPS = [
  'Widget membaca gold dari run pipeline terbaru — jalankan ulang pipeline untuk memperbarui data.',
  'Pilih node gold dari daftar run terbaru saat menambah widget.',
  'Dashboard publik dapat dilihat siapa saja; privat hanya pemilik dan anggota tim.',
  'Geser dan ubah ukuran widget di mode editor untuk menyusun layout.',
]

type Props = {
  className?: string
  onCreateClick?: () => void
}

export function AnalyticsSidebar({ className, onCreateClick }: Props) {
  const tip = ANALYTICS_TIPS[new Date().getDate() % ANALYTICS_TIPS.length]

  const dashboards = useQuery({
    queryKey: ['analytics-dashboards', 'sidebar'],
    queryFn: () => listDashboards({ page: 1 }),
    staleTime: 60_000,
  })

  const pipelines = useQuery({
    queryKey: ['factory-pipelines', 'sidebar-analytics'],
    queryFn: () => listPipelines({ page: 1 }),
    staleTime: 60_000,
  })

  const items = dashboards.data?.items ?? []
  const publicCount = items.filter((d: DashboardSummary) => d.visibility === 'public').length
  const privateCount = items.length - publicCount
  const pipelineCount = pipelines.data?.items.length ?? 0

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-2 gap-2">
        <SidebarStatTile label="Dashboard" value={items.length} icon={<ChartBarSquareIcon className="size-4" />} accent="primary" />
        <SidebarStatTile label="Publik" value={publicCount} icon={<GlobeAltIcon className="size-4" />} accent="sky" />
        <SidebarStatTile label="Privat" value={privateCount} icon={<LockClosedIcon className="size-4" />} accent="amber" />
        <SidebarStatTile label="Pipeline" value={pipelineCount} icon={<QueueListIcon className="size-4" />} />
      </div>

      <div className={sidebarCalloutClass}>
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <ChartBarSquareIcon className="size-4 text-primary-600 dark:text-primary-400" aria-hidden />
          Tips analitik
        </div>
        <p className={sidebarTipClass}>{tip}</p>
      </div>

      <Link
        href="/factory/pipelines"
        className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-primary-200 hover:text-primary-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-primary-800"
      >
        Pabrik Data
        <ArrowRightIcon className="size-4" aria-hidden />
      </Link>

      <Link
        href="/factory/sources"
        className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-primary-200 hover:text-primary-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-primary-800"
      >
        Sumber data
        <Cog6ToothIcon className="size-4" aria-hidden />
      </Link>

      {onCreateClick && (
        <button
          type="button"
          onClick={onCreateClick}
          className="w-full rounded-2xl border border-dashed border-primary-300 bg-primary-50/50 px-4 py-3 text-sm font-medium text-primary-700 transition hover:bg-primary-50 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-300"
        >
          + Dashboard baru
        </button>
      )}
    </aside>
  )
}
