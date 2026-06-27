'use client'

import { JOURNEY_PHASES } from '@/lib/quests/journeyPhases'
import clsx from 'clsx'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

type Props = {
  activeIndex?: number
  className?: string
}

export function JourneyRing({ activeIndex = 0, className }: Props) {
  return (
    <div className={clsx('relative mx-auto flex max-w-lg items-center justify-center', className)}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-100/60 via-transparent to-blue-100/40 blur-2xl dark:from-primary-900/30 dark:to-blue-900/20" />
      <div className="relative grid w-full grid-cols-2 gap-3 sm:gap-4">
        {JOURNEY_PHASES.map((phase, i) => {
          const active = i === activeIndex
          const done = i < activeIndex
          const PhaseIcon = phase.Icon
          return (
            <div
              key={phase.key}
              className={clsx(
                'relative flex flex-col items-center rounded-2xl border p-4 text-center transition-all sm:p-5',
                active
                  ? 'border-primary-300 bg-white shadow-lg shadow-primary-100/50 dark:border-primary-700 dark:bg-neutral-800 dark:shadow-primary-950/30'
                  : done
                    ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                    : 'border-neutral-200/80 bg-white/80 dark:border-neutral-700 dark:bg-neutral-800/60',
              )}
            >
              <div
                className={clsx(
                  'flex size-12 items-center justify-center rounded-full shadow-inner sm:size-14',
                  active ? `bg-gradient-to-br ${phase.color} text-white` : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400',
                )}
              >
                <PhaseIcon className="size-6 sm:size-7" aria-hidden />
              </div>
              <p className={clsx('mt-3 text-sm font-semibold', active ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-200')}>
                {phase.label}
              </p>
              {active && (
                <span className="mt-1 text-xs font-medium text-primary-600 dark:text-primary-400">Anda di sini</span>
              )}
              {done && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircleIcon className="size-3.5" aria-hidden />
                  Selesai
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
