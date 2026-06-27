'use client'

import type { Quest } from '@/types/api'
import { Badge } from '@/shared/Badge'
import clsx from 'clsx'
import Link from 'next/link'
import { CheckBadgeIcon, GiftIcon } from '@heroicons/react/24/outline'

export function QuestCard({ quest }: { quest: Quest }) {
  const pct = quest.progress.total ? Math.round((quest.progress.done / quest.progress.total) * 100) : 0
  const highlight = quest.claimable

  return (
    <Link
      href={`/quests/${quest.slug}`}
      className={clsx(
        'group relative flex flex-col overflow-hidden rounded-3xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-neutral-800',
        highlight
          ? 'border-primary-400 ring-2 ring-primary-200 dark:border-primary-600 dark:ring-primary-900/50'
          : 'border-neutral-200/80 dark:border-neutral-700',
      )}
    >
      {highlight && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-blue-500" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
            {quest.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{quest.description}</p>
        </div>
        {quest.claimed && (
          <Badge color="green" className="shrink-0">
            <CheckBadgeIcon className="size-3.5" />
            Diklaim
          </Badge>
        )}
        {quest.claimable && (
          <Badge color="rose" className="shrink-0 !bg-primary-50 !text-primary-700 animate-pulse">
            <GiftIcon className="size-3.5" />
            Klaim
          </Badge>
        )}
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs font-medium text-neutral-500">
          <span>
            {quest.progress.done}/{quest.progress.total} langkah
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-500">
        {quest.reward_reputation > 0 && (
          <span className="rounded-full bg-primary-50 px-2.5 py-1 font-medium text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
            +{quest.reward_reputation} reputasi
          </span>
        )}
        {quest.reward_badge && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Badge: {quest.reward_badge}
          </span>
        )}
      </div>
    </Link>
  )
}
