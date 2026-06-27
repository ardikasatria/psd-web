'use client'

import { getJourney } from '@/lib/api/quests'
import { JOURNEY_PHASES } from '@/lib/quests/journeyPhases'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline'

type Props = {
  variant?: 'dashboard' | 'compact'
  className?: string
}

export function JourneyNextCard({ variant = 'dashboard', className }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['me', 'journey'],
    queryFn: getJourney,
  })

  if (isLoading) {
    return (
      <div
        className={clsx(
          'animate-pulse rounded-3xl bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-950/30 dark:to-blue-950/20',
          variant === 'dashboard' ? 'h-44' : 'h-28',
          className,
        )}
      />
    )
  }

  const next = data?.next
  if (!next) return null

  const isCompact = variant === 'compact'

  return (
    <section
      className={clsx(
        'relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-white to-blue-50 shadow-sm dark:border-primary-800/40 dark:from-primary-950/40 dark:via-neutral-900 dark:to-blue-950/30',
        isCompact ? 'p-5' : 'p-6 sm:p-8',
        className,
      )}
    >
      <div className="pointer-events-none absolute -end-8 -top-8 size-32 rounded-full bg-primary-200/30 blur-2xl dark:bg-primary-700/20" />
      <div className="pointer-events-none absolute -bottom-6 -start-6 size-24 rounded-full bg-blue-200/30 blur-2xl dark:bg-blue-800/20" />

      <div className={clsx('relative', isCompact ? 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between' : 'space-y-6')}>
        <div className={clsx(isCompact ? 'min-w-0 flex-1' : 'max-w-xl')}>
          <div className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
            <SparklesIcon className="size-4" aria-hidden />
            Langkah berikutnya
          </div>
          <h3 className={clsx('mt-1 font-semibold text-neutral-900 dark:text-neutral-50', isCompact ? 'text-lg' : 'text-xl sm:text-2xl')}>
            {next.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{next.description}</p>
          {!isCompact && (
            <div className="mt-5 flex flex-wrap gap-2">
              {JOURNEY_PHASES.map((phase, i) => {
                const PhaseIcon = phase.Icon
                return (
                <span
                  key={phase.key}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                    i === 0
                      ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200'
                      : 'bg-white/80 text-neutral-500 dark:bg-neutral-800/80 dark:text-neutral-400',
                  )}
                >
                  <PhaseIcon className="size-3.5 shrink-0" aria-hidden />
                  {phase.label}
                </span>
                )
              })}
            </div>
          )}
        </div>

        <div className={clsx('shrink-0', !isCompact && 'flex items-end justify-between gap-4')}>
          {!isCompact && (
            <Link href="/quests" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
              Lihat semua quest →
            </Link>
          )}
          <ButtonPrimary href={next.cta_link} className="group">
            Mulai
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" data-slot="icon" />
          </ButtonPrimary>
        </div>
      </div>
    </section>
  )
}
