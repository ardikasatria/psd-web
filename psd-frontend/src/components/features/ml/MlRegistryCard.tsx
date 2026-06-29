import type { ModelRegistrySummary } from '@/lib/api/ml'
import { Badge } from '@/shared/Badge'
import {
  ArrowPathIcon,
  ChartBarIcon,
  CubeIcon,
  RectangleStackIcon,
  SignalIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

const CARD_ACCENTS = [
  'from-violet-400 to-indigo-600',
  'from-indigo-400 to-violet-500',
  'from-primary-400 to-indigo-500',
  'from-sky-400 to-indigo-600',
] as const

export function MlRegistryCard({ registry, index = 0 }: { registry: ModelRegistrySummary; index?: number }) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800">
      <Link
        href={`/ml/${registry.slug}`}
        className="absolute inset-0 z-0 rounded-3xl"
        aria-label={`Registry ${registry.title}`}
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
            <RectangleStackIcon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
              {registry.title}
            </h3>
            <p className="mt-1 truncate font-mono text-xs text-neutral-500">{registry.mlflow_name}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {registry.repo_id && (
                <Badge color="violet" className="!text-[10px]">
                  <CubeIcon className="mr-0.5 size-3" aria-hidden />
                  Repo
                </Badge>
              )}
              {registry.monitoring_dashboard_id && (
                <Badge color="sky" className="!text-[10px]">
                  <ChartBarIcon className="mr-0.5 size-3" aria-hidden />
                  Monitoring
                </Badge>
              )}
              {registry.competition_id && (
                <Badge color="amber" className="!text-[10px]">
                  Kompetisi
                </Badge>
              )}
            </div>
          </div>
        </div>

        {registry.description_md && (
          <p className="mt-3 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
            {registry.description_md.replace(/[#*_`]/g, '').slice(0, 120)}
          </p>
        )}

        <div className="relative z-10 mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-700">
          <Link
            href={`/ml/${registry.slug}`}
            className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50"
          >
            <ArrowPathIcon className="size-3.5" aria-hidden />
            Versi & drift
          </Link>
          <Link
            href={`/ml/${registry.slug}/serving`}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
          >
            <SignalIcon className="size-3.5" aria-hidden />
            Serving
          </Link>
        </div>
      </div>
    </div>
  )
}
