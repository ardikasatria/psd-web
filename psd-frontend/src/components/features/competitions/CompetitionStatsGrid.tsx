'use client'

import type { CompDetailStats } from '@/types/api'
import {
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

const items: {
  key: keyof CompDetailStats
  label: string
  icon: typeof UsersIcon
}[] = [
  { key: 'participants', label: 'Peserta', icon: UsersIcon },
  { key: 'teams', label: 'Tim', icon: UserGroupIcon },
  { key: 'submissions', label: 'Submission', icon: DocumentTextIcon },
  { key: 'scored', label: 'Dinilai', icon: ChartBarIcon },
  { key: 'pending_review', label: 'Menunggu review', icon: ChartBarIcon },
  { key: 'notebooks', label: 'Notebook', icon: DocumentTextIcon },
]

export function CompetitionStatsGrid({ stats, className }: { stats: CompDetailStats; className?: string }) {
  return (
    <div className={clsx('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items.map(({ key, label, icon: Icon }) => (
        <div
          key={key}
          className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white px-4 py-3 dark:border-neutral-700/80 dark:bg-neutral-800/60"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400">
            <Icon className="size-4" aria-hidden />
          </div>
          <div>
            <p className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {stats[key].toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
