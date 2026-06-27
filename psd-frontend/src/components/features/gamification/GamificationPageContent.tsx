'use client'

import { QueryState } from '@/components/features/QueryState'
import { AchievementBadge } from '@/components/features/gamification/AchievementBadge'
import { TierBadge } from '@/components/features/gamification/TierBadge'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { SettingsShell } from '@/components/features/settings/SettingsShell'
import { getMyGamification } from '@/lib/api/gamification'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import type { BadgeDef, Gamification } from '@/types/api'
import clsx from 'clsx'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

function TierProgress({ tier }: { tier: Gamification['tier'] }) {
  const max = tier.next_at ?? tier.reputation
  const pct = tier.next_at ? Math.min(100, Math.round((tier.reputation / tier.next_at) * 100)) : 100

  return (
    <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center gap-4">
        <TierBadge level={tier.level} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-neutral-500">Tier Anda</p>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{tier.name}</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {tier.reputation.toLocaleString('id-ID')} reputasi
          </p>
        </div>
      </div>
      <div className="mt-6">
        {tier.next_at ? (
          <>
            <div className="mb-2 flex justify-between text-xs text-neutral-500">
              <span>{tier.reputation}</span>
              <span>{tier.next_at} ke tier berikutnya</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-[#f09394] motion-safe:transition-all motion-safe:duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
            Tier tertinggi — Grandmaster! 🎉
          </p>
        )}
      </div>
    </div>
  )
}

function PerksList({ perks, tierName }: { perks: Gamification['perks']; tierName: string }) {
  const items = [
    { label: 'Ukuran upload maks', value: `${perks.upload_max_mb} MB` },
    { label: 'Bonus submission/hari', value: `+${perks.daily_submission_bonus}` },
    { label: 'Kuota notebook', value: String(perks.notebook_quota) },
    { label: 'Batas posting/hari', value: String(perks.daily_post_limit) },
    { label: 'Gambar per postingan', value: String(perks.post_image_max) },
    { label: 'Prioritas event', value: perks.event_priority ? 'Ya' : 'Belum' },
    { label: 'Buat event', value: perks.can_create_event ? 'Ya' : 'Belum' },
  ]

  return (
    <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
      <h3 className="text-lg font-semibold">Hak Anda</h3>
      <p className="mt-1 text-sm text-neutral-500">Berdasarkan tier {tierName}</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">{item.label}</span>
            <span className="font-semibold text-neutral-900 dark:text-white">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function GamificationPageContent() {
  useAuthGuard()
  const { data, isLoading, isError, error } = useQuery<Gamification>({
    queryKey: ['me', 'gamification'],
    queryFn: getMyGamification,
  })

  return (
    <DetailPageShell>
      <DetailPageHeader
        title="Pencapaian saya"
        subtitle="Reputasi, tier, badge, dan hak yang Anda miliki di PSD."
      />

      <div className="mb-6">
        <Link
          href="/leaderboard"
          className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Lihat papan peringkat kontributor →
        </Link>
      </div>

      <QueryState isLoading={isLoading} isError={isError} error={error}>
        {data && (
          <div className="space-y-8">
            <TierProgress tier={data.tier} />

            <section>
              <h3 className="mb-4 text-lg font-semibold">Badge</h3>
              <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {data.badges.map((badge: BadgeDef) => (
                  <div key={badge.id} className="group relative">
                    <AchievementBadge
                      name={badge.name}
                      tier={badge.tier}
                      earned={badge.earned}
                    />
                    <p
                      className={clsx(
                        'pointer-events-none absolute -bottom-1 left-1/2 z-10 hidden w-44 -translate-x-1/2 translate-y-full rounded-xl border border-neutral-200 bg-white p-2 text-xs text-neutral-600 shadow-lg group-hover:block dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
                        !badge.earned && 'group-hover:block'
                      )}
                    >
                      {badge.description}
                      {!badge.earned && (
                        <span className="mt-1 block text-neutral-400">Belum diraih</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <PerksList perks={data.perks} tierName={data.tier.name} />
          </div>
        )}
      </QueryState>
    </DetailPageShell>
  )
}
