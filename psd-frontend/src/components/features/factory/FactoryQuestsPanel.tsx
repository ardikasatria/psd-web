'use client'

import { claimQuest, getMyQuests } from '@/lib/api/quests'
import { sidebarSectionClass } from '@/components/common/SidebarStatTile'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

const FACTORY_QUEST_SLUGS = new Set([
  'analis-pemula-factory',
  'penjelajah-sql',
  'naik-ke-spark',
  'produsen-data',
  'rajin-mengolah',
])

export function FactoryQuestsPanel({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient()
  const quests = useQuery({
    queryKey: ['me', 'quests', 'factory'],
    queryFn: getMyQuests,
    staleTime: 30_000,
  })

  const items = (quests.data?.items ?? []).filter((q) => FACTORY_QUEST_SLUGS.has(q.slug))

  const claimMut = useMutation({
    mutationFn: (slug: string) => claimQuest(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'quests'] }),
  })

  if (!items.length) return null

  return (
    <section className={sidebarSectionClass}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <SparklesIcon className="size-4 text-amber-600 dark:text-amber-400" />
          Quest Pabrik Data
        </h3>
        {!compact && (
          <Link href="/quests" className="text-xs font-medium text-primary-600 dark:text-primary-400">
            Semua →
          </Link>
        )}
      </div>
      <ul className="space-y-3">
        {items.slice(0, compact ? 2 : 5).map((q) => {
          const pct = q.progress.total ? Math.round((q.progress.done / q.progress.total) * 100) : 0
          return (
            <li key={q.slug} className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/50">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{q.title}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">+{q.reward_reputation} poin</p>
                </div>
                {q.claimed && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Selesai
                  </span>
                )}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-neutral-500">
                {q.progress.done}/{q.progress.total} langkah
              </p>
              {q.claimable && !q.claimed && (
                <ButtonPrimary
                  type="button"
                  className="mt-2 !w-full !py-1.5 !text-xs"
                  disabled={claimMut.isPending}
                  onClick={() => claimMut.mutate(q.slug)}
                >
                  Klaim reward
                </ButtonPrimary>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
