'use client'

import { CourseDetail } from '@/types/api'
import { formatDuration } from './learnUtils'
import { AcademicCapIcon, ChartBarIcon, ClockIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

export function CourseStatsStrip({ course, className }: { course: CourseDetail; className?: string }) {
  const stats = course.stats
  const duration = formatDuration(course.total_duration_min ?? 0)

  const items = [
    {
      icon: AcademicCapIcon,
      value: stats.enrolled.toLocaleString('id-ID'),
      label: 'pembelajar terdaftar',
      accent: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      icon: ClockIcon,
      value: `${stats.lessons} lesson`,
      sub: duration,
      label: 'durasi total',
      accent: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/30',
    },
    {
      icon: ChartBarIcon,
      value: `${stats.completion_rate}%`,
      sub: `${stats.completed} selesai`,
      label: 'tingkat penyelesaian',
      accent: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
    },
  ]

  return (
    <div
      className={clsx(
        'grid gap-3 sm:grid-cols-3',
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={clsx(
            'flex items-center gap-3 rounded-2xl border border-neutral-200/80 p-4 dark:border-neutral-700/80',
            item.bg,
          )}
        >
          <div className={clsx('flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/80 dark:bg-neutral-900/50', item.accent)}>
            <item.icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
              {item.value}
              {item.sub && (
                <span className="ms-1 text-sm font-medium text-neutral-500">· {item.sub}</span>
              )}
            </p>
            <p className="text-xs text-neutral-500">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
