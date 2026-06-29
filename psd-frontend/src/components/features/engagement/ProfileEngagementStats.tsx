'use client'

import { formatCompactCount } from '@/lib/utils/format'
import type { UserEngagementStats } from '@/types/api'
import clsx from 'clsx'
import { HeartIcon, ShareIcon, ArrowDownTrayIcon, EyeIcon, FolderIcon } from '@heroicons/react/24/outline'

function StatBlock({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-primary-600 dark:text-primary-400">{icon}</div>
      <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900 dark:text-white">
        {formatCompactCount(value)}
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  )
}

export function ProfileEngagementStats({
  engagement,
  className,
}: {
  engagement: UserEngagementStats
  className?: string
}) {
  return (
    <section
      className={clsx(
        'grid grid-cols-2 gap-4 rounded-2xl border border-neutral-200/80 bg-gradient-to-br from-primary-50/60 via-white to-neutral-50 p-5 dark:border-neutral-700 dark:from-primary-950/30 dark:via-neutral-900 dark:to-neutral-800 sm:grid-cols-5',
        className,
      )}
    >
      <StatBlock label="Total suka" value={engagement.total_loves_received} icon={<HeartIcon className="size-4" />} />
      <StatBlock label="Dibagikan" value={engagement.total_shares} icon={<ShareIcon className="size-4" />} />
      <StatBlock label="Diunduh" value={engagement.total_downloads} icon={<ArrowDownTrayIcon className="size-4" />} />
      <StatBlock label="Dilihat" value={engagement.total_views} icon={<EyeIcon className="size-4" />} />
      <StatBlock label="Aset" value={engagement.asset_count} icon={<FolderIcon className="size-4" />} />
    </section>
  )
}
