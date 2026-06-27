'use client'

import { darkPanelClass, highlightGradientBr } from '@/components/common/featureGradients'
import { sidebarTipClass } from '@/components/common/SidebarStatTile'
import { TierBadge } from '@/components/features/gamification/TierBadge'
import {
  enrichGoalsWithQuests,
  findMyRank,
  incompleteQuests,
  pendingQuestReputation,
  rankGoal,
  tierGoal,
} from '@/lib/gamification/projections'
import { questStepHref, QUEST_STEP_LABELS } from '@/lib/quests/utils'
import type { ContributorRow, Gamification, Quest } from '@/types/api'
import {
  ArrowTrendingUpIcon,
  BoltIcon,
  ChartBarIcon,
  FlagIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

function GoalCard({
  label,
  targetLabel,
  gap,
  achievable,
  questRep,
  kind,
}: {
  label: string
  targetLabel: string
  gap: number
  achievable: boolean
  questRep: number
  kind: 'tier' | 'rank'
}) {
  const pct = questRep > 0 ? Math.min(100, Math.round((questRep / gap) * 100)) : 0

  return (
    <div
      className={clsx(
        'rounded-2xl border p-4',
        achievable
          ? 'border-primary-200/80 bg-gradient-to-br from-primary-50/80 via-white to-violet-50/40 dark:border-neutral-700 dark:from-neutral-900 dark:via-neutral-800/95 dark:to-violet-950/35'
          : darkPanelClass,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
          <p className="mt-0.5 text-base font-semibold text-neutral-900 dark:text-neutral-100">{targetLabel}</p>
        </div>
        {kind === 'rank' ? (
          <ChartBarIcon className="size-5 shrink-0 text-indigo-500" aria-hidden />
        ) : (
          <SparklesIcon className="size-5 shrink-0 text-primary-500" aria-hidden />
        )}
      </div>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Butuh <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">+{gap}</span> reputasi
      </p>
      {questRep > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>Proyeksi dari quest</span>
            <span className="font-medium text-primary-600 dark:text-primary-300">+{questRep}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-700/80">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-500',
                achievable ? 'bg-gradient-to-r from-primary-400 to-indigo-500' : 'bg-primary-300 dark:bg-primary-700',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {achievable ? (
              <span className="text-primary-700 dark:text-primary-300">Quest aktif cukup menutupi target ini</span>
            ) : (
              <>Masih kurang {Math.max(0, gap - questRep)} rep setelah quest selesai</>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

function QuestStepRow({ quest }: { quest: Quest }) {
  const next = quest.steps.find((s) => !s.done)
  if (!next) return null
  const stepLabel = QUEST_STEP_LABELS[next.type] ?? next.type

  return (
    <li className={clsx(darkPanelClass, 'flex items-start gap-3 p-3')}>
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
        <FlagIcon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <Link href={`/quests/${quest.slug}`} className="font-medium text-neutral-900 hover:text-primary-600 dark:text-neutral-100">
          {quest.title}
        </Link>
        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{next.title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-primary-50 px-2 py-0.5 font-semibold text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
            +{quest.reward_reputation} rep
          </span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
            {stepLabel}
          </span>
        </div>
      </div>
      <Link
        href={questStepHref(next)}
        className="shrink-0 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-700"
      >
        Mulai
      </Link>
    </li>
  )
}

export function PersonalQuestPanel({
  gamification,
  quests,
  contributors,
  username,
}: {
  gamification: Gamification
  quests: Quest[]
  contributors: ContributorRow[]
  username?: string
}) {
  const pending = incompleteQuests(quests)
  const questRep = pendingQuestReputation(quests)
  const rank = findMyRank(contributors, username)
  const tierPct = gamification.tier.next_at
    ? Math.min(100, Math.round((gamification.tier.reputation / gamification.tier.next_at) * 100))
    : 100

  const goals = enrichGoalsWithQuests(
    [tierGoal(gamification.tier), rankGoal(gamification.tier.reputation, rank, contributors)].filter(
      (g): g is NonNullable<typeof g> => g != null,
    ),
    questRep,
  )

  return (
    <section className={highlightGradientBr.gamification}>
      <div className="border-b border-primary-200/50 bg-white/40 px-6 py-5 dark:border-neutral-700 dark:bg-neutral-800/55 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <TierBadge level={gamification.tier.level} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <BoltIcon className="size-4 text-primary-600 dark:text-primary-400" aria-hidden />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Misi Anda</h2>
              </div>
              <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                {gamification.tier.name} · {gamification.tier.reputation.toLocaleString('id-ID')} rep
                {rank != null && <> · peringkat #{rank}</>}
              </p>
            </div>
          </div>
          {questRep > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm ring-1 ring-primary-200/80 dark:bg-neutral-800/90 dark:text-primary-300 dark:ring-neutral-600">
              <ArrowTrendingUpIcon className="size-4" aria-hidden />
              +{questRep} rep tersedia dari quest
            </div>
          )}
        </div>
        {gamification.tier.next_at && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span>Progres tier</span>
              <span>
                {gamification.tier.reputation} / {gamification.tier.next_at}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-700/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-400 via-sky-400 to-indigo-400"
                style={{ width: `${tierPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Proyeksi pencapaian</h3>
          {goals.length === 0 ? (
            <p className={clsx(sidebarTipClass, 'px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400')}>
              Anda sudah di puncak tier dan peringkat — pertahankan momentum!
            </p>
          ) : (
            <div className="space-y-3">
              {goals.map((g) => (
                <GoalCard
                  key={g.kind}
                  kind={g.kind}
                  label={g.label}
                  targetLabel={g.targetLabel}
                  gap={g.gap}
                  achievable={g.achievable}
                  questRep={questRep}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Quest belum selesai</h3>
            <Link href="/quests" className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
              Semua quest
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className={clsx(sidebarTipClass, 'px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400')}>
              Semua quest aktif sudah selesai. Klaim hadiah di halaman quest.
            </p>
          ) : (
            <ul className="space-y-2">
              {pending.map((q) => (
                <QuestStepRow key={q.slug} quest={q} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
