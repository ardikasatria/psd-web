'use client'

import { sidebarGradientBr } from '@/components/common/featureGradients'
import { getCompetitionStats } from '@/lib/api/competitions'
import { getContributors } from '@/lib/api/gamification'
import { getForumStats } from '@/lib/api/community'
import { getFeedStats } from '@/lib/api/social'
import { getEventStats } from '@/lib/api/events'
import { getMyGamification } from '@/lib/api/gamification'
import { findMyRank } from '@/lib/gamification/projections'
import { profilePath } from '@/lib/routes/profile'
import { useAuth } from '@/lib/auth/useAuth'
import {
  AcademicCapIcon,
  BoltIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  FireIcon,
  HashtagIcon,
  NewspaperIcon,
  TrophyIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

type Props = {
  className?: string
}

function StatTile({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-800/60">
      <div className="text-primary-600 dark:text-primary-400">{icon}</div>
      <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{value}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  )
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-neutral-600 transition hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-400 dark:hover:bg-primary-950/30 dark:hover:text-primary-300"
    >
      {icon}
      {label}
    </Link>
  )
}

export function LeaderboardSidebar({ className }: Props) {
  const { isLoggedIn, user } = useAuth()
  const contributors = useQuery({ queryKey: ['leaderboard', 'contributors'], queryFn: () => getContributors(), staleTime: 60_000 })
  const gamification = useQuery({
    queryKey: ['me', 'gamification'],
    queryFn: getMyGamification,
    enabled: isLoggedIn,
    staleTime: 60_000,
  })
  const compStats = useQuery({ queryKey: ['competition-stats'], queryFn: getCompetitionStats, staleTime: 60_000 })
  const forumStats = useQuery({ queryKey: ['forum-stats'], queryFn: getForumStats, staleTime: 60_000 })
  const feedStats = useQuery({ queryKey: ['feed-stats'], queryFn: getFeedStats, staleTime: 60_000 })
  const eventStats = useQuery({ queryKey: ['event-stats'], queryFn: getEventStats, staleTime: 60_000 })

  const rows = contributors.data?.items ?? []
  const myRank = findMyRank(rows, user?.username)
  const myRep = gamification.data?.tier.reputation

  const tags = [
    ...(compStats.data?.trending_tags ?? []),
    ...(forumStats.data?.trending_tags ?? []),
    ...(feedStats.data?.trending_tags ?? []),
  ]
  const tagMap = new Map<string, number>()
  for (const { tag, count } of tags) {
    tagMap.set(tag, (tagMap.get(tag) ?? 0) + count)
  }
  const mergedTags = [...tagMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const pulseTotal =
    (compStats.data?.active ?? 0) +
    (forumStats.data?.active_this_week ?? 0) +
    (feedStats.data?.active_this_week ?? 0) +
    (eventStats.data?.upcoming ?? 0)

  return (
    <aside className={clsx('space-y-5', className)}>
      {isLoggedIn && myRank != null && myRep != null && (
        <div className={sidebarGradientBr.gamification}>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
            Posisi Anda
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-50">#{myRank}</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {myRep.toLocaleString('id-ID')} reputasi · {gamification.data?.tier.name}
          </p>
          <Link href="/me/gamification" className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
            Lihat pencapaian
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="Kompetisi aktif"
          value={compStats.isLoading ? '—' : (compStats.data?.active ?? 0)}
          icon={<TrophyIcon className="size-4" />}
        />
        <StatTile
          label="Pulse minggu ini"
          value={pulseTotal || '—'}
          icon={<BoltIcon className="size-4" />}
        />
        <StatTile
          label="Utas forum"
          value={forumStats.isLoading ? '—' : (forumStats.data?.total_threads ?? 0)}
          icon={<ChatBubbleLeftRightIcon className="size-4" />}
        />
        <StatTile
          label="Event mendatang"
          value={eventStats.isLoading ? '—' : (eventStats.data?.upcoming ?? 0)}
          icon={<CalendarDaysIcon className="size-4" />}
        />
      </div>

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <HashtagIcon className="size-4 text-primary-500" />
          Tag trending
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {mergedTags.length === 0 && (
            <p className="text-xs text-neutral-500">Belum ada tag trending.</p>
          )}
          {mergedTags.map(({ tag, count }) => (
            <span
              key={tag}
              className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
            >
              #{tag} ({count})
            </span>
          ))}
        </div>
      </section>

      {(feedStats.data?.people_of_week ?? []).length > 0 && (
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <UserGroupIcon className="size-4 text-indigo-500" />
            Kontributor minggu ini
          </h3>
          <ul className="mt-3 space-y-2">
            {feedStats.data!.people_of_week.slice(0, 4).map(({ user: u, score }) => (
              <li key={u.username} className="flex items-center justify-between text-sm">
                <Link href={profilePath(u.username)} className="font-medium hover:text-primary-600 dark:hover:text-primary-400">
                  @{u.username}
                </Link>
                <span className="text-xs tabular-nums text-neutral-500">+{score}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Jelajahi fitur</h3>
        <nav className="mt-2 space-y-0.5">
          <QuickLink href="/competitions" icon={<TrophyIcon className="size-4" />} label="Kompetisi" />
          <QuickLink href="/forum" icon={<ChatBubbleLeftRightIcon className="size-4" />} label="Forum" />
          <QuickLink href="/community" icon={<NewspaperIcon className="size-4" />} label="Feed" />
          <QuickLink href="/events" icon={<CalendarDaysIcon className="size-4" />} label="Event" />
          <QuickLink href="/learn/paths" icon={<AcademicCapIcon className="size-4" />} label="Jalur belajar" />
          <QuickLink href="/explore" icon={<FireIcon className="size-4" />} label="Aset portofolio" />
        </nav>
      </section>
    </aside>
  )
}
