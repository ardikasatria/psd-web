'use client'

import { sidebarGradientBr } from '@/components/common/featureGradients'
import { getCompetitionStats } from '@/lib/api/competitions'
import { getMyQuests } from '@/lib/api/quests'
import { getMySubmissions } from '@/lib/api/me'
import { questStepHref } from '@/lib/quests/utils'
import { useAuth } from '@/lib/auth/useAuth'
import type { CompetitionStats, Quest } from '@/types/api'
import {
  ChartBarIcon,
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

function CompetitionQuestCard({ quest }: { quest: Quest }) {
  const pct = quest.progress.total ? Math.round((quest.progress.done / quest.progress.total) * 100) : 0
  const next = quest.steps.find((s) => !s.done)
  const submitStep = quest.steps.find((s) => s.type === 'submit_competition')

  return (
    <div className={sidebarGradientBr.competition}>
      <div className="flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300">
        <GiftIcon className="size-4" aria-hidden />
        Quest kompetisi
      </div>
      <Link href={`/quests/${quest.slug}`} className="mt-2 block font-medium text-neutral-900 hover:text-primary-600 dark:text-neutral-100">
        {quest.title}
      </Link>
      {submitStep && !submitStep.done && (
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{submitStep.description}</p>
      )}
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function CompetitionsSidebar({ activeTag, onTagClick, className }: Props) {
  const { isLoggedIn } = useAuth()
  const stats = useQuery<CompetitionStats>({
    queryKey: ['competition-stats'],
    queryFn: getCompetitionStats,
    staleTime: 60_000,
  })
  const quests = useQuery({
    queryKey: ['my-quests'],
    queryFn: getMyQuests,
    enabled: isLoggedIn,
    staleTime: 60_000,
  })
  const mySubmissions = useQuery({
    queryKey: ['my-submissions', 'sidebar'],
    queryFn: () => getMySubmissions({ page_size: 3 }),
    enabled: isLoggedIn,
    staleTime: 60_000,
  })

  const journeyQuest = quests.data?.items.find(
    (q) => q.slug === 'mulai-perjalanan' && !q.claimed && q.steps.some((s) => s.type === 'submit_competition'),
  )
  const data = stats.data

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Total"
          value={stats.isLoading ? '—' : (data?.total_competitions ?? 0)}
          icon={<TrophyIcon className="size-4" />}
        />
        <StatTile
          label="Aktif"
          value={stats.isLoading ? '—' : (data?.active ?? 0)}
          icon={<FireIcon className="size-4" />}
        />
        <StatTile
          label="Peserta"
          value={stats.isLoading ? '—' : (data?.total_participants ?? 0)}
          icon={<UserGroupIcon className="size-4" />}
        />
      </div>

      {journeyQuest && <CompetitionQuestCard quest={journeyQuest} />}

      {!isLoggedIn && (
        <div className="rounded-2xl border border-dashed border-primary-300/80 bg-primary-50/50 p-4 dark:border-primary-800 dark:bg-primary-950/20">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Quest Mulai Perjalanan</p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            Kirim submission kompetisi untuk menyelesaikan langkah &quot;Buktikan&quot; dan dapatkan +30 reputasi.
          </p>
          <Link href="/login?next=/competitions" className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline">
            Masuk untuk mulai
          </Link>
        </div>
      )}

      {isLoggedIn && (data?.my_active ?? 0) > 0 && (
        <div className={sidebarGradientBr.event}>
          <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">Kompetisi Anda</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">{data!.my_active}</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">kompetisi aktif dengan submission</p>
        </div>
      )}

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <HashtagIcon className="size-4 text-primary-500" />
          Tag populer
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {(data?.trending_tags ?? []).length === 0 && (
            <p className="text-xs text-neutral-500">Belum ada tag kompetisi.</p>
          )}
          {(data?.trending_tags ?? []).map(({ tag, count }) => {
            const active = activeTag === tag
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick?.(active ? null : tag)}
                className={clsx(
                  'rounded-full px-2.5 py-1 text-xs font-medium motion-safe:transition-colors',
                  active
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300',
                )}
              >
                #{tag} ({count})
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <SparklesIcon className="size-4 text-amber-500" />
          Sorotan
        </h3>
        <ul className="mt-3 space-y-3">
          {(data?.featured ?? []).map((c) => (
            <li key={c.slug}>
              <Link
                href={`/competitions/${c.slug}`}
                className="block rounded-xl border border-neutral-100 p-2.5 transition-colors hover:border-primary-200 hover:bg-primary-50/50 dark:border-neutral-700 dark:hover:border-primary-800"
              >
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{c.title}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {c.prize_pool ?? 'Hadiah menarik'} · {c.participants} peserta
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <ChartBarIcon className="size-4 text-orange-500" />
          Paling ramai
        </h3>
        <ul className="mt-3 space-y-3">
          {(data?.hot_active ?? []).map((c) => (
            <li key={c.slug}>
              <Link
                href={`/competitions/${c.slug}`}
                className="block rounded-xl p-1.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
              >
                <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">{c.title}</p>
                <p className="text-xs text-neutral-500">
                  {c.participants} peserta · {c.metric} · berakhir {formatDate(c.ends_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {isLoggedIn && (mySubmissions.data?.items.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Submission terbaru</h3>
          <ul className="mt-3 space-y-2">
            {mySubmissions.data!.items.map((s) => (
              <li key={s.id} className="text-sm">
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{s.competition.title}</span>
                <p className="text-xs text-neutral-500">
                  {s.filename}
                  {s.public_score != null ? ` · skor ${s.public_score}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-800/60">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Ingin networking?</p>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Ikuti event komunitas untuk workshop dan meetup langsung.
        </p>
        <Link href="/events" className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
          Lihat event →
        </Link>
      </section>
    </aside>
  )
}
