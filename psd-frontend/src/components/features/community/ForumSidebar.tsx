'use client'

import { getForumStats } from '@/lib/api/community'
import { getMyQuests } from '@/lib/api/quests'
import { questStepHref } from '@/lib/quests/utils'
import { timeAgo } from '@/lib/utils/format'
import type { ForumStats, Quest } from '@/types/api'
import { useAuth } from '@/lib/auth/useAuth'
import Avatar from '@/shared/Avatar'
import {
  ChatBubbleLeftRightIcon,
  FireIcon,
  GiftIcon,
  HashtagIcon,
  SparklesIcon,
  TrophyIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

type Props = {
  activeTag?: string | null
  onTagClick?: (tag: string | null) => void
  className?: string
}

function StatTile({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-800/60">
      <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">{icon}</div>
      <p className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  )
}

function ForumQuestCard({ quest }: { quest: Quest }) {
  const pct = quest.progress.total ? Math.round((quest.progress.done / quest.progress.total) * 100) : 0
  const next = quest.steps.find((s) => !s.done)

  return (
    <div className="rounded-2xl border border-primary-200/80 bg-gradient-to-br from-primary-50/90 to-blue-50/50 p-4 dark:border-primary-800/50 dark:from-primary-950/40 dark:to-neutral-900">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300">
        <GiftIcon className="size-4" aria-hidden />
        Quest forum
      </div>
      <Link href={`/quests/${quest.slug}`} className="mt-2 block font-medium text-neutral-900 hover:text-primary-600 dark:text-neutral-100">
        {quest.title}
      </Link>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80 dark:bg-neutral-800">
        <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">
        {quest.progress.done}/{quest.progress.total} langkah · +{quest.reward_reputation} rep
      </p>
      {next && (
        <Link
          href={questStepHref(next)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Lanjut: {next.title}
        </Link>
      )}
    </div>
  )
}

export function ForumSidebar({ activeTag, onTagClick, className }: Props) {
  const { isLoggedIn } = useAuth()
  const stats = useQuery<ForumStats>({
    queryKey: ['forum-stats'],
    queryFn: getForumStats,
    staleTime: 60_000,
  })
  const quests = useQuery({
    queryKey: ['my-quests'],
    queryFn: getMyQuests,
    enabled: isLoggedIn,
    staleTime: 60_000,
  })

  const forumQuest = quests.data?.items.find((q) => q.slug === 'aktif-di-forum')
  const data = stats.data

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Utas"
          value={stats.isLoading ? '—' : (data?.total_threads ?? 0)}
          icon={<ChatBubbleLeftRightIcon className="size-4" />}
        />
        <StatTile
          label="Balasan"
          value={stats.isLoading ? '—' : (data?.total_replies ?? 0)}
          icon={<SparklesIcon className="size-4" />}
        />
        <StatTile
          label="Aktif 7 hari"
          value={stats.isLoading ? '—' : (data?.active_this_week ?? 0)}
          icon={<FireIcon className="size-4" />}
        />
      </div>

      {forumQuest && !forumQuest.claimed && <ForumQuestCard quest={forumQuest} />}

      {!isLoggedIn && (
        <div className="rounded-2xl border border-dashed border-primary-300/80 bg-primary-50/50 p-4 dark:border-primary-800 dark:bg-primary-950/20">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Quest Aktif di Forum</p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            Masuk untuk membuka topik dan membalas diskusi — dapatkan +15 reputasi.
          </p>
          <Link href="/login?next=/forum" className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline">
            Masuk untuk mulai
          </Link>
        </div>
      )}

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <HashtagIcon className="size-4 text-primary-500" />
          Topik tren
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {(data?.trending_tags ?? []).length === 0 && (
            <p className="text-xs text-neutral-500">Belum ada tag populer.</p>
          )}
          {(data?.trending_tags ?? []).map(({ tag, count }) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick?.(activeTag === tag ? null : tag)}
              className={clsx(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                activeTag === tag
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:bg-neutral-700 dark:text-neutral-300',
              )}
            >
              #{tag} <span className="opacity-70">({count})</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <FireIcon className="size-4 text-orange-500" />
          Diskusi hangat
        </h3>
        <ul className="mt-3 space-y-2">
          {(data?.hot_threads ?? []).map((t) => (
            <li key={t.id}>
              <Link
                href={`/forum/${t.id}`}
                className="block rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
              >
                <span className="line-clamp-2 font-medium text-neutral-800 dark:text-neutral-200">{t.title}</span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {t.replies} balasan · {timeAgo(t.last_activity_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <TrophyIcon className="size-4 text-amber-500" />
          Kontributor minggu ini
        </h3>
        <ul className="mt-3 space-y-3">
          {(data?.people_of_week ?? []).length === 0 && (
            <p className="text-xs text-neutral-500">Belum ada aktivitas minggu ini.</p>
          )}
          {(data?.people_of_week ?? []).map(({ user, score }, i) => (
            <li key={user.username}>
              <Link
                href={`/${user.username}`}
                className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                  {i + 1}
                </span>
                {user.avatar_url ? (
                  <Avatar src={user.avatar_url} alt={user.username} className="size-8" width={32} height={32} sizes="32px" />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-600">
                    <UserGroupIcon className="size-4 text-neutral-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">{user.username}</p>
                  <p className="text-xs text-neutral-500">{score} poin aktivitas</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
