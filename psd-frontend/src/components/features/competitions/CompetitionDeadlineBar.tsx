'use client'

import type { DeadlineProgress } from '@/types/api'
import clsx from 'clsx'
import { CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline'

const phaseLabels: Record<DeadlineProgress['phase'], string> = {
  upcoming: 'Akan dibuka',
  active: 'Sedang berlangsung',
  ended: 'Selesai',
}

const phaseColors: Record<DeadlineProgress['phase'], string> = {
  upcoming: 'bg-amber-500',
  active: 'bg-primary-500',
  ended: 'bg-neutral-400 dark:bg-neutral-600',
}

type Props = {
  deadline: DeadlineProgress
  metric?: string
  metricDirection?: string
  className?: string
}

export function CompetitionDeadlineBar({ deadline, metric, metricDirection, className }: Props) {
  const pct = Math.round(deadline.progress * 100)
  const message =
    deadline.phase === 'upcoming'
      ? `Dibuka dalam ${deadline.remaining_text}`
      : deadline.phase === 'active'
        ? `Berakhir dalam ${deadline.remaining_text}`
        : 'Kompetisi selesai'

  return (
    <div
      className={clsx(
        'rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-5 dark:border-neutral-700/80 dark:bg-neutral-900/50',
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
          <ClockIcon className="size-4 text-primary-500" aria-hidden />
          {message}
        </div>
        <span
          className={clsx(
            'rounded-full px-2.5 py-0.5 text-xs font-semibold text-white',
            phaseColors[deadline.phase]
          )}
        >
          {phaseLabels[deadline.phase]}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div
          className={clsx('h-full rounded-full transition-all', phaseColors[deadline.phase])}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {(metric || metricDirection) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          {metric && (
            <span className="inline-flex items-center gap-1">
              <CalendarDaysIcon className="size-3.5" aria-hidden />
              Metrik: <strong className="font-medium text-neutral-700 dark:text-neutral-300">{metric}</strong>
            </span>
          )}
          {metricDirection && <span>({metricDirection})</span>}
        </div>
      )}
    </div>
  )
}
