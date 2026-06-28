'use client'

import { darkPanelLgClass, heroGradient } from '@/components/common/featureGradients'
import { pageCtaPanelClass } from '@/components/common/SidebarStatTile'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { QueryState } from '@/components/features/QueryState'
import { LeaderboardPodium } from '@/components/features/gamification/LeaderboardPodium'
import { LeaderboardSidebar } from '@/components/features/gamification/LeaderboardSidebar'
import { PersonalQuestPanel } from '@/components/features/gamification/PersonalQuestPanel'
import { TierBadge } from '@/components/features/gamification/TierBadge'
import { TrendingHub } from '@/components/features/gamification/TrendingHub'
import { FeaturePageShell } from '@/components/features/layout'
import { getContributors, getMyGamification } from '@/lib/api/gamification'
import { getMyQuests } from '@/lib/api/quests'
import { profilePath } from '@/lib/routes/profile'
import { useAuth } from '@/lib/auth/useAuth'
import type { ContributorRow, PaginatedContributor } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { BoltIcon, TrophyIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

const TOP_N = 10

import { TIER_LEVEL_BY_LABEL } from '@/lib/gamification/config'
  const { user, isLoggedIn } = useAuth()

  const { data, isLoading, isError, error } = useQuery<PaginatedContributor>({
    queryKey: ['leaderboard', 'contributors'],
    queryFn: () => getContributors(),
  })

  const gamification = useQuery({
    queryKey: ['me', 'gamification'],
    queryFn: getMyGamification,
    enabled: isLoggedIn,
  })

  const quests = useQuery({
    queryKey: ['me', 'quests'],
    queryFn: getMyQuests,
    enabled: isLoggedIn,
  })

  const rows = data?.items ?? []
  const top10 = rows.slice(0, TOP_N)

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <LeaderboardSidebar className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72" />

        <div className="order-1 min-w-0 flex-1 space-y-8 lg:order-2">
          <div className={heroGradient.gamification}>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                  <TrophyIcon className="size-3.5" aria-hidden />
                  Arena reputasi
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Peringkat & momentum
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Naik peringkat lewat kontribusi nyata — selesaikan quest, ikuti kompetisi, dan biarkan reputasi
                  Anda tumbuh. Semua yang sedang trending di PSD ada di sini.
                </p>
              </div>
              {!isLoggedIn && (
                <ButtonPrimary href="/login?next=/leaderboard" className="shrink-0">
                  <BoltIcon className="size-4" aria-hidden />
                  Masuk & mulai quest
                </ButtonPrimary>
              )}
            </div>
            <div
              className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-primary-400/10 blur-3xl dark:bg-primary-600/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 start-1/3 size-48 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-600/10"
              aria-hidden
            />
          </div>

          {isLoggedIn && gamification.data && quests.data && (
            <PersonalQuestPanel
              gamification={gamification.data}
              quests={quests.data.items}
              contributors={rows}
              username={user?.username}
            />
          )}

          {!isLoggedIn && (
            <div className={pageCtaPanelClass}>
              <BoltIcon className="mx-auto size-8 text-primary-500" aria-hidden />
              <p className="mt-3 font-semibold text-neutral-900 dark:text-neutral-100">Quest & proyeksi poin</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Masuk untuk melihat misi belum selesai, poin yang bisa diraih, dan proyeksi naik peringkat atau tier.
              </p>
              <Link href="/login?next=/leaderboard" className="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                Masuk sekarang
              </Link>
            </div>
          )}

          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!rows.length}
            emptyTitle="Belum ada data"
            emptyDescription="Mulai berkontribusi untuk muncul di papan peringkat."
          >
            <div className="space-y-8">
              <LeaderboardPodium rows={rows} myUsername={user?.username} />

              <section className={clsx(darkPanelLgClass, 'overflow-hidden')}>
                <div className="border-b border-neutral-200/80 px-6 py-4 dark:border-neutral-700">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">10 besar kontributor</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Peringkat berdasarkan reputasi kumulatif.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-left text-sm">
                    <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/95 dark:text-neutral-400">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Kontributor</th>
                        <th className="hidden px-4 py-3 sm:table-cell">Tier</th>
                        <th className="px-4 py-3 text-right">Reputasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top10.map((row: ContributorRow) => {
                        const isMe = user?.username === row.user.username
                        const level = TIER_LEVEL_BY_LABEL[row.tier] ?? 0
                        const isTop3 = row.rank <= 3
                        return (
                          <tr
                            key={row.user.username}
                            className={clsx(
                              'border-b border-neutral-100 last:border-0 dark:border-neutral-800',
                              isMe && 'bg-primary-50/80 dark:bg-violet-950/25',
                              isTop3 && !isMe && 'bg-gradient-to-r from-primary-50/30 to-transparent dark:from-violet-950/20 dark:to-transparent',
                            )}
                          >
                            <td className="px-4 py-3 font-mono font-semibold text-neutral-500 dark:text-neutral-400">{row.rank}</td>
                            <td className="px-4 py-3">
                              <Link
                                href={profilePath(row.user.username)}
                                className="inline-flex items-center gap-2 font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                              >
                                @{row.user.username}
                                {row.user.is_official && <OfficialBadge className="!text-[10px]" />}
                                {isMe && (
                                  <span className="rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                                    Anda
                                  </span>
                                )}
                              </Link>
                            </td>
                            <td className="hidden px-4 py-3 sm:table-cell">
                              <span className="inline-flex items-center gap-2">
                                <TierBadge level={level} size="sm" title={row.tier} />
                                <span className="text-neutral-600 dark:text-neutral-400">{row.tier}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                              {row.reputation.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </QueryState>

          <TrendingHub />
        </div>
      </div>
    </FeaturePageShell>
  )
}
