'use client'

import { SidebarStatTile, sidebarCalloutClass, sidebarSectionClass, sidebarTipClass } from '@/components/common/SidebarStatTile'
import { listPipelines, listSources } from '@/lib/api/factory'
import type { PipelineSummary } from '@/types/api'
import {
  ArrowRightIcon,
  ChartBarSquareIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

const FACTORY_TIPS = [
  'Daftarkan dataset sebagai sumber dulu — node source pipeline butuh source_id yang valid.',
  'Pipeline harus DAG (asiklik): source → transform → sink, tanpa loop.',
  'Tier reputasi membatasi jumlah node — naikkan reputasi untuk pipeline lebih kompleks.',
  'Simpan spec JSON, lalu klik Validasi untuk melihat error sebelum eksekusi (Langkah 45).',
]

type Props = {
  className?: string
  onCreateClick?: () => void
}

export function FactorySidebar({ className, onCreateClick }: Props) {
  const tip = FACTORY_TIPS[new Date().getDate() % FACTORY_TIPS.length]

  const pipelines = useQuery({
    queryKey: ['factory-pipelines', 'sidebar'],
    queryFn: () => listPipelines({ page: 1 }),
    staleTime: 60_000,
  })

  const sources = useQuery({
    queryKey: ['factory-sources', 'sidebar'],
    queryFn: listSources,
    staleTime: 60_000,
  })

  const items = pipelines.data?.items ?? []
  const valid = items.filter((p: PipelineSummary) => p.status === 'valid').length
  const errors = items.filter((p: PipelineSummary) => p.status === 'error').length
  const drafts = items.filter((p: PipelineSummary) => p.status === 'draft').length
  const sourceCount = sources.data?.items.length ?? 0

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-2 gap-2">
        <SidebarStatTile label="Pipeline" value={items.length} icon={<QueueListIcon className="size-4" />} />
        <SidebarStatTile label="Sumber" value={sourceCount} icon={<CircleStackIcon className="size-4" />} accent="sky" />
        <SidebarStatTile label="Valid" value={valid} icon={<Cog6ToothIcon className="size-4" />} accent="emerald" />
        <SidebarStatTile label="Error" value={errors} icon={<ExclamationTriangleIcon className="size-4" />} accent="amber" />
      </div>

      {drafts > 0 && (
        <div className={sidebarSectionClass}>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            {drafts} pipeline draft
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Lengkapi spec dan validasi agar siap dijalankan nanti.
          </p>
        </div>
      )}

      <div className={sidebarCalloutClass}>
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <Cog6ToothIcon className="size-4 text-primary-600 dark:text-primary-400" aria-hidden />
          Tips pipeline
        </div>
        <p className={sidebarTipClass}>{tip}</p>
      </div>

      <Link
        href="/analytics"
        className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-primary-200 hover:text-primary-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-primary-800"
      >
        Ruang Analitik
        <ChartBarSquareIcon className="size-4" aria-hidden />
      </Link>

      <Link
        href="/factory/sources"
        className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-primary-200 hover:text-primary-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-primary-800"
      >
        Sumber data
        <ArrowRightIcon className="size-4" aria-hidden />
      </Link>

      {onCreateClick && (
        <button
          type="button"
          onClick={onCreateClick}
          className="w-full rounded-2xl border border-dashed border-primary-300 bg-primary-50/50 px-4 py-3 text-sm font-medium text-primary-700 transition hover:bg-primary-50 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-300"
        >
          + Pipeline baru
        </button>
      )}
    </aside>
  )
}
