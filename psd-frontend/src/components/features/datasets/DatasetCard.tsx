import { CategoryBadge } from '@/components/common/CategoryBadge'
import { FeaturedBadge } from '@/components/common/FeaturedBadge'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { SyntheticBadge } from '@/components/common/SyntheticBadge'
import { TeamBadge } from '@/components/common/TeamBadge'
import { Badge } from '@/shared/Badge'
import { trackRepoClick } from '@/lib/analytics/entities'
import { RepoSummary } from '@/types/api'
import {
  ArrowDownTrayIcon,
  CubeIcon,
  HeartIcon,
  TableCellsIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

const CARD_ACCENTS = [
  'from-sky-400 to-indigo-600',
  'from-blue-400 to-indigo-500',
  'from-indigo-400 to-sky-500',
  'from-primary-400 to-indigo-500',
] as const

function formatRows(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M baris`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K baris`
  return `${n.toLocaleString('id-ID')} baris`
}

export function DatasetCard({ dataset, index = 0 }: { dataset: RepoSummary; index?: number }) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
  const href = `/datasets/${dataset.owner.username}/${dataset.name}`
  const preview = dataset.dataset_preview

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800">
      <Link
        href={href}
        className="absolute inset-0 z-0 rounded-3xl"
        aria-label={`Dataset ${dataset.name} oleh ${dataset.owner.username}`}
        onClick={() => trackRepoClick(dataset)}
      />
      <div className={clsx('pointer-events-none h-1.5 w-full bg-gradient-to-r', accent)} />
      <div className="pointer-events-none flex flex-1 flex-col p-5">
        <div className="flex items-start gap-4">
          <div
            className={clsx(
              'flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
              accent,
            )}
          >
            <CubeIcon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="line-clamp-2 font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
                {dataset.name}
              </h3>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                {dataset.featured && <FeaturedBadge />}
                {dataset.synthetic && <SyntheticBadge />}
                {preview?.format && (
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    {preview.format}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-neutral-500">
              <UserIcon className="size-3.5 shrink-0" aria-hidden />
              {dataset.owner.username}
              {dataset.owner.is_official && <OfficialBadge />}
              {dataset.team && <TeamBadge team={dataset.team} />}
            </p>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {dataset.description}
        </p>

        {preview && (preview.rows != null || preview.size_mb != null) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {preview.rows != null && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                <TableCellsIcon className="size-3.5" aria-hidden />
                {formatRows(preview.rows)}
                {preview.columns != null && ` · ${preview.columns} kolom`}
              </span>
            )}
            {preview.size_mb != null && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                {preview.size_mb >= 100 ? `${(preview.size_mb / 1024).toFixed(1)} GB` : `${preview.size_mb} MB`}
              </span>
            )}
          </div>
        )}

        <CategoryBadge category={dataset.category} subcategory={dataset.subcategory} className="mt-3" />

        {dataset.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-700">
            {dataset.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} color="zinc">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 text-sm text-neutral-500">
          <span className="flex items-center gap-1.5">
            <HeartIcon className="size-4" aria-hidden />
            {dataset.likes}
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowDownTrayIcon className="size-4" aria-hidden />
            {dataset.downloads}
          </span>
        </div>
      </div>
    </div>
  )
}
