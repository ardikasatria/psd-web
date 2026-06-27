'use client'

import { useToast } from '@/components/common/Toast'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { claimQuest, getMyQuests } from '@/lib/api/quests'
import { getApiErrorMessage } from '@/lib/api/errors'
import type { Quest } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { GiftIcon, TrophyIcon } from '@heroicons/react/24/outline'
import { QuestStepList } from './QuestStepList'

export function QuestDetailContent({ slug }: { slug: string }) {
  const { toast } = useToast()
  const qc = useQueryClient()

  const quests = useQuery({ queryKey: ['me', 'quests'], queryFn: getMyQuests })
  const quest: Quest | undefined = quests.data?.items.find((q: Quest) => q.slug === slug)

  const claim = useMutation({
    mutationFn: () => claimQuest(slug),
    onSuccess: (res) => {
      const parts = [`+${res.reward_reputation} reputasi`]
      if (res.reward_badge) parts.push(`badge "${res.reward_badge}"`)
      toast(`Hadiah diklaim: ${parts.join(' · ')}`, 'default')
      qc.invalidateQueries({ queryKey: ['me', 'quests'] })
      qc.invalidateQueries({ queryKey: ['me', 'gamification'] })
      qc.invalidateQueries({ queryKey: ['me', 'journey'] })
    },
    onError: (err) => toast(getApiErrorMessage(err), 'error'),
  })

  const pct = quest && quest.progress.total ? Math.round((quest.progress.done / quest.progress.total) * 100) : 0

  return (
    <FeaturePageShell>
      <Link href="/quests" className="text-sm font-medium text-neutral-500 hover:text-primary-600">
        ← Semua quest
      </Link>

      <QueryState isLoading={quests.isLoading} isError={quests.isError} error={quests.error}>
        {quest && (
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800 lg:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
                    {quest.title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-400">{quest.description}</p>
                </div>
                {quest.claimed && <Badge color="green">Diklaim</Badge>}
              </div>

              <div className="mt-6">
                <div className="mb-2 flex justify-between text-sm font-medium">
                  <span className="text-neutral-600 dark:text-neutral-400">Progres</span>
                  <span className="text-primary-600 dark:text-primary-400">
                    {quest.progress.done}/{quest.progress.total} ({pct}%)
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="mt-10">
                <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-neutral-500">Langkah quest</h2>
                <QuestStepList steps={quest.steps} />
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-neutral-200/80 bg-gradient-to-br from-primary-50 to-white p-6 dark:border-neutral-700 dark:from-primary-950/30 dark:to-neutral-800">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300">
                  <TrophyIcon className="size-5" />
                  Hadiah
                </div>
                <ul className="mt-4 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                  {quest.reward_reputation > 0 && <li>+{quest.reward_reputation} reputasi</li>}
                  {quest.reward_badge && <li>Badge: {quest.reward_badge}</li>}
                  {!quest.reward_reputation && !quest.reward_badge && <li>Tidak ada hadiah tambahan</li>}
                </ul>

                {quest.claimable && (
                  <ButtonPrimary
                    className="mt-5 w-full"
                    onClick={() => claim.mutate()}
                    disabled={claim.isPending}
                  >
                    <GiftIcon className="size-5" data-slot="icon" />
                    {claim.isPending ? 'Mengklaim…' : 'Klaim hadiah'}
                  </ButtonPrimary>
                )}
                {quest.complete && quest.claimed && (
                  <p className="mt-4 text-center text-sm text-emerald-600 dark:text-emerald-400">Quest selesai!</p>
                )}
                {!quest.complete && (
                  <p className="mt-4 text-center text-xs text-neutral-500">Selesaikan semua langkah untuk mengklaim hadiah.</p>
                )}
              </div>
            </aside>
          </div>
        )}
        {!quest && !quests.isLoading && (
          <div className="mt-12 text-center">
            <p className="text-neutral-500">Quest tidak ditemukan.</p>
            <ButtonPrimary href="/quests" className="mt-4">
              Kembali ke daftar
            </ButtonPrimary>
          </div>
        )}
      </QueryState>
    </FeaturePageShell>
  )
}
