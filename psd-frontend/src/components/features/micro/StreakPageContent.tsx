'use client'

import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { StreakHeatmap } from '@/components/features/micro/StreakHeatmap'
import { getStreak } from '@/lib/api/micro'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  BoltIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'

export function StreakPageContent() {
  const streak = useQuery({ queryKey: ['me', 'streak'], queryFn: getStreak })
  const s = streak.data
  const weeklyPct = s ? Math.min(100, Math.round((s.weekly_done / s.weekly_goal) * 100)) : 0

  return (
    <DetailPageShell>
      <DetailPageHeader
        title="Konsistensi belajar"
        subtitle="Streak lembut PSD — melewatkan satu hari tidak mengakhiri perjalanan Anda."
      />

      <QueryState isLoading={streak.isLoading} isError={streak.isError} error={streak.error}>
        {s && (
          <div className="space-y-6">
            <section className="rounded-3xl border border-primary-200/70 bg-gradient-to-br from-primary-50 to-white p-6 dark:border-primary-800/50 dark:from-primary-950/30 dark:to-neutral-900 lg:p-8">
              <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                Fokus pada target mingguan — bukan ketakutan kehilangan streak.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <StatCard
                  icon={BoltIcon}
                  label="Streak saat ini"
                  value={`${s.current_streak} hari`}
                  hint={s.active_today ? 'Aktif hari ini' : 'Grace 1 hari — masih aman jika belajar kemarin'}
                />
                <StatCard icon={TrophyIcon} label="Terpanjang" value={`${s.longest_streak} hari`} />
                <StatCard
                  icon={ChartBarIcon}
                  label="Minggu ini"
                  value={`${s.weekly_done}/${s.weekly_goal} hari`}
                  hint={`${weeklyPct}% dari target lembut`}
                />
              </div>
              <div className="mt-5">
                <div className="mb-1.5 flex justify-between text-xs font-medium text-neutral-500">
                  <span>Target mingguan</span>
                  <span>{weeklyPct}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                    style={{ width: `${weeklyPct}%` }}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800 lg:p-8">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                <CalendarDaysIcon className="size-5 text-primary-600" />
                30 hari terakhir
              </h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Hari dengan aktivitas belajar (course atau micro-lesson) disorot.
              </p>
              <div className="mt-6 flex justify-center">
                <StreakHeatmap days={s.calendar} />
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-sm bg-neutral-200 dark:bg-neutral-700" />
                  Istirahat
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-sm bg-gradient-to-br from-primary-400 to-primary-600" />
                  Belajar
                </span>
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <ButtonPrimary href="/dashboard">Kembali ke dasbor</ButtonPrimary>
              <ButtonPrimary href="/learn" outline>
                Jelajahi course
              </ButtonPrimary>
            </div>
          </div>
        )}
      </QueryState>
    </DetailPageShell>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <Icon className="size-4 text-primary-600" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-50">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  )
}
