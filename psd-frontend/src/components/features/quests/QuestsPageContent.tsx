'use client'

import { QueryState } from '@/components/features/QueryState'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { getMyQuests } from '@/lib/api/quests'
import type { Quest } from '@/types/api'
import { useQuery } from '@tanstack/react-query'
import { JourneyNextCard } from './JourneyNextCard'
import { JourneyRing } from './JourneyRing'
import { QuestCard } from './QuestCard'

function inferActivePhase(quests: { progress: { done: number; total: number }; complete: boolean }[]): number {
  const avg =
    quests.length > 0
      ? quests.reduce((s, q) => s + (q.progress.total ? q.progress.done / q.progress.total : 0), 0) / quests.length
      : 0
  if (avg >= 0.85) return 3
  if (avg >= 0.55) return 2
  if (avg >= 0.25) return 1
  return 0
}

export function QuestsPageContent() {
  useAuthGuard('/login?next=/quests')
  const quests = useQuery({ queryKey: ['me', 'quests'], queryFn: getMyQuests })
  const items = quests.data?.items ?? []
  const activePhase = inferActivePhase(items)
  const claimable = items.filter((q: Quest) => q.claimable)

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title="Perjalanan Quest"
        subtitle="Ikuti lingkaran terpandu PSD — belajar, buktikan, berkontribusi, dan bangun portofolio langkah demi langkah."
        variant="compact"
      />

      <div className="mt-8 space-y-8">
        <JourneyNextCard variant="compact" />

        <section className="rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800 lg:p-10">
          <div className="mb-8 text-center">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Lingkaran PSD</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Empat fase yang memandu perjalanan Anda di komunitas sains data.
            </p>
          </div>
          <JourneyRing activeIndex={activePhase} />
        </section>

        {claimable.length > 0 && (
          <div className="rounded-2xl border border-primary-200 bg-primary-50/50 px-4 py-3 text-sm text-primary-800 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-200">
            {claimable.length} quest siap diklaim — buka kartu yang bersinar untuk mengambil hadiah.
          </div>
        )}

        <section>
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Quest aktif</h2>
          <QueryState isLoading={quests.isLoading} isError={quests.isError} error={quests.error}>
            {items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-neutral-300 py-12 text-center text-neutral-500 dark:border-neutral-600">
                Belum ada quest aktif. Pantau terus — quest baru akan ditambahkan oleh tim PSD.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {items.map((q: Quest) => (
                  <QuestCard key={q.slug} quest={q} />
                ))}
              </div>
            )}
          </QueryState>
        </section>
      </div>
    </FeaturePageShell>
  )
}
