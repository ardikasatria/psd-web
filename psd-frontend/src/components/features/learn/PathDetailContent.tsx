'use client'

import { heroGradient } from '@/components/common/featureGradients'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { getLearningPath } from '@/lib/api/learn'
import {
  PATH_PHASES,
  normalizePathItems,
  pathItemHref,
  pathItemTypeLabel,
} from '@/lib/learning/pathItems'
import { LearningPathDetail, PathItem, PathPhase } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import clsx from 'clsx'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  MapIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

function pathBreadcrumb(title?: string) {
  return [
    { label: 'Belajar', href: '/learn' },
    { label: 'Jalur belajar', href: '/paths' },
    { label: title ?? '…' },
  ]
}

function PathCircleStrip({ counts }: { counts: Record<PathPhase, number> }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {PATH_PHASES.map((phase, i) => {
        const n = counts[phase.key] ?? 0
        return (
          <div
            key={phase.key}
            className={clsx(
              'rounded-2xl border px-3 py-3 text-center sm:px-4 sm:py-4',
              i === 0 && 'border-primary-200 bg-primary-50/80 dark:border-primary-800 dark:bg-primary-950/30',
              i === 1 && 'border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20',
              i === 2 && 'border-sky-200 bg-sky-50/80 dark:border-sky-900/40 dark:bg-sky-950/20',
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{phase.label}</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">{n}</p>
            <p className="mt-0.5 text-[10px] leading-tight text-neutral-500 sm:text-xs">{phase.subtitle}</p>
          </div>
        )
      })}
    </div>
  )
}

function PathItemRow({ item, index }: { item: PathItem; index: number }) {
  return (
    <li className="flex gap-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-primary-700 ring-1 ring-primary-200 dark:bg-neutral-800 dark:text-primary-300 dark:ring-primary-800">
        {index + 1}
      </span>
      <Link
        href={pathItemHref(item)}
        className="group min-w-0 flex-1 rounded-2xl border border-neutral-200/80 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Badge color="zinc">{pathItemTypeLabel(item.type)}</Badge>
            <p className="mt-2 font-semibold text-neutral-900 group-hover:text-primary-700 dark:text-neutral-100 dark:group-hover:text-primary-300">
              {item.title ?? item.ref}
            </p>
            {item.note && <p className="mt-1 text-sm text-neutral-500">{item.note}</p>}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400">
            Buka
            <ArrowRightIcon className="size-3.5" aria-hidden />
          </span>
        </div>
      </Link>
    </li>
  )
}

export function PathDetailContent({ slug }: { slug: string }) {
  const pathQuery = useQuery<LearningPathDetail>({
    queryKey: ['learning-path', slug],
    queryFn: () => getLearningPath(slug),
  })

  const data = pathQuery.data
  const items = normalizePathItems(data?.items, data?.course_slugs)
  const firstItem = items[0]
  const phaseCounts = data?.phase_counts ?? {
    belajar: items.filter((i) => i.phase === 'belajar').length,
    buktikan: items.filter((i) => i.phase === 'buktikan').length,
    berpeluang: items.filter((i) => i.phase === 'berpeluang').length,
  }

  return (
    <FeaturePageShell>
      <div className="space-y-6">
        <Breadcrumb items={pathBreadcrumb(data?.title)} />

        <QueryState isLoading={pathQuery.isLoading} isError={pathQuery.isError} error={pathQuery.error}>
          {data && (
            <div className="space-y-8">
            <div className={heroGradient.learn}>
              <div className="relative z-10 max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                  <MapIcon className="size-3.5" aria-hidden />
                  Belajar → Buktikan → Berpeluang
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  {data.title}
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {data.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {firstItem && (
                    <ButtonPrimary href={pathItemHref(firstItem)}>
                      <AcademicCapIcon className="size-4" aria-hidden />
                      Mulai jalur
                    </ButtonPrimary>
                  )}
                  <Link
                    href="/learn"
                    className="inline-flex items-center gap-1 self-center rounded-full px-4 py-2 text-sm font-medium text-primary-700 ring-1 ring-primary-200 transition hover:bg-primary-50 dark:text-primary-300 dark:ring-primary-800 dark:hover:bg-primary-950/40"
                  >
                    Katalog Belajar
                  </Link>
                </div>
              </div>
              <div
                className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-primary-400/10 blur-3xl dark:bg-primary-600/10"
                aria-hidden
              />
            </div>

            <PathCircleStrip counts={phaseCounts} />

            {PATH_PHASES.map((phase) => {
              const phaseItems = items.filter((i) => i.phase === phase.key)
              if (!phaseItems.length) return null
              return (
                <section key={phase.key}>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {phase.key === 'berpeluang' ? (
                      <TrophyIcon className="size-5 text-sky-500" aria-hidden />
                    ) : (
                      <AcademicCapIcon className="size-5 text-primary-500" aria-hidden />
                    )}
                    {phase.label}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">{phase.subtitle} — {phase.hint}</p>
                  <ol className="mt-4 space-y-3">
                    {phaseItems.map((item, i) => (
                      <PathItemRow key={`${item.type}-${item.ref}`} item={item} index={i} />
                    ))}
                  </ol>
                </section>
              )
            })}
            </div>
          )}
        </QueryState>
      </div>
    </FeaturePageShell>
  )
}
