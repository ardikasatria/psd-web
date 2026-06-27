'use client'

import clsx from 'clsx'
import type { StreakDay } from '@/types/api'

type Props = {
  days: StreakDay[]
  compact?: boolean
  className?: string
}

export function StreakHeatmap({ days, compact = false, className }: Props) {
  const cell = compact ? 'size-2.5 sm:size-3' : 'size-3.5 sm:size-4'

  return (
    <div className={clsx('flex flex-wrap gap-1', className)} role="img" aria-label="Kalender aktivitas belajar 30 hari">
      {days.map((d) => {
        const date = new Date(d.date + 'T12:00:00')
        const label = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        return (
          <span
            key={d.date}
            title={`${label}${d.active ? ' — aktif' : ''}`}
            className={clsx(
              'rounded-sm motion-safe:transition-colors',
              cell,
              d.active
                ? 'bg-gradient-to-br from-primary-400 to-primary-600 shadow-sm'
                : 'bg-neutral-200 dark:bg-neutral-700',
            )}
          />
        )
      })}
    </div>
  )
}
