'use client'

import { conceptGradientBr } from '@/components/common/featureGradients'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { TierBadge } from '@/components/features/gamification/TierBadge'
import { profilePath } from '@/lib/routes/profile'
import type { ContributorRow } from '@/types/api'
import { TrophyIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

import { TIER_LEVEL_BY_LABEL } from '@/lib/gamification/config' = [
  { place: 2, height: 'h-28', gradient: 'from-sky-200/90 to-indigo-100/80 dark:from-sky-900/40 dark:to-indigo-950/30', ring: 'ring-sky-200/80 dark:ring-sky-800/50' },
  { place: 1, height: 'h-36', gradient: 'from-primary-200/90 to-amber-100/80 dark:from-primary-900/50 dark:to-amber-950/30', ring: 'ring-primary-300/80 dark:ring-primary-700/50' },
  { place: 3, height: 'h-24', gradient: 'from-indigo-200/80 to-violet-100/70 dark:from-indigo-900/40 dark:to-violet-950/30', ring: 'ring-indigo-200/80 dark:ring-indigo-800/50' },
] as const

function PodiumSlot({ row, place, isMe }: { row: ContributorRow | undefined; place: number; isMe: boolean }) {
  const config = PODIUM.find((p) => p.place === place)!
  const level = row ? (TIER_LEVEL_BY_LABEL[row.tier] ?? 0) : 0

  if (!row) {
    return (
      <div className="flex flex-1 flex-col items-center justify-end">
        <div className={clsx('w-full rounded-t-2xl border border-dashed border-neutral-200/80 bg-neutral-50/50 dark:border-neutral-700 dark:bg-neutral-800/30', config.height)} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-end">
      <div className="mb-3 flex flex-col items-center text-center">
        {place === 1 && (
          <TrophyIcon className="mb-1 size-5 text-amber-500 dark:text-amber-400" aria-hidden />
        )}
        <Link
          href={profilePath(row.user.username)}
          className={clsx(
            'relative flex flex-col items-center rounded-2xl p-2 transition hover:bg-white/60 dark:hover:bg-neutral-800/40',
            isMe && 'ring-2 ring-primary-400/60',
          )}
        >
          <TierBadge level={level} size="sm" title={row.tier} />
          <span className="mt-2 inline-flex max-w-[7rem] items-center gap-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            @{row.user.username}
          </span>
          {row.user.is_official && <OfficialBadge className="!text-[10px]" />}
          {isMe && (
            <span className="mt-1 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              Anda
            </span>
          )}
        </Link>
        <p className="mt-1 text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-50">
          {row.reputation.toLocaleString('id-ID')}
        </p>
        <p className="text-xs text-neutral-500">{row.tier}</p>
      </div>
      <div
        className={clsx(
          'flex w-full items-end justify-center rounded-t-2xl bg-gradient-to-t ring-1',
          config.height,
          config.gradient,
          config.ring,
        )}
      >
        <span className="pb-3 text-2xl font-black text-neutral-700/80 dark:text-neutral-200/80">{place}</span>
      </div>
    </div>
  )
}

export function LeaderboardPodium({
  rows,
  myUsername,
}: {
  rows: ContributorRow[]
  myUsername?: string
}) {
  const top3 = [1, 2, 3].map((rank) => rows.find((r) => r.rank === rank))
  const order = [top3[1], top3[0], top3[2]]

  if (rows.length === 0) return null

  return (
    <section
      aria-label="Tiga kontributor teratas"
      className={conceptGradientBr.gamification}
    >
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Podium kontributor</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Tiga teratas berdasarkan reputasi kumulatif.
        </p>
      </div>
      <div className="mx-auto flex max-w-lg items-end gap-2 sm:gap-4">
        <PodiumSlot row={order[0]} place={2} isMe={myUsername === order[0]?.user.username} />
        <PodiumSlot row={order[1]} place={1} isMe={myUsername === order[1]?.user.username} />
        <PodiumSlot row={order[2]} place={3} isMe={myUsername === order[2]?.user.username} />
      </div>
    </section>
  )
}
