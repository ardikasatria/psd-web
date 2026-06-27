'use client'

import { getDailyMicro, getStreak } from '@/lib/api/micro'
import type { MicroSummary } from '@/types/api'
import { StreakHeatmap } from '@/components/features/micro/StreakHeatmap'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BoltIcon,
  CalendarDaysIcon,
  ClockIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline'

export function DailyLearningWidget({ className }: { className?: string }) {
  const streak = useQuery({ queryKey: ['me', 'streak'], queryFn: getStreak })
  const daily = useQuery({ queryKey: ['micro', 'daily'], queryFn: getDailyMicro })

  const isLoading = streak.isLoading || daily.isLoading
  const s = streak.data
  const items = daily.data?.items ?? []
  const weeklyPct = s ? Math.min(100, Math.round((s.weekly_done / s.weekly_goal) * 100)) : 0

  if (isLoading) {
    return (
      <div
        className={clsx(
          'animate-pulse rounded-3xl bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-950/30 dark:to-blue-950/20',
          'h-56',
          className,
        )}
      />
    )
  }

  if (!s) return null

  return (
    <section
      className={clsx(
        'relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-white to-blue-50 shadow-sm dark:border-primary-800/40 dark:from-primary-950/40 dark:via-neutral-900 dark:to-blue-950/30',
        className,
      )}
    >
      <div className="pointer-events-none absolute -end-10 -top-10 size-40 rounded-full bg-primary-200/25 blur-3xl dark:bg-primary-700/15" />

      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
              <AcademicCapIcon className="size-4" aria-hidden />
              Belajar hari ini
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-4">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Target mingguan</p>
                <p className="mt-0.5 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                  Belajar {s.weekly_done}/{s.weekly_goal} hari minggu ini
                </p>
              </div>
              {s.current_streak > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-sm font-medium text-primary-700 shadow-sm dark:bg-neutral-800/80 dark:text-primary-300">
                  <BoltIcon className="size-4" aria-hidden />
                  {s.current_streak} hari berturut-turut
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs font-medium text-neutral-500">
                <span>Progres minggu ini</span>
                <span>{weeklyPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500"
                  style={{ width: `${weeklyPct}%` }}
                />
              </div>
            </div>

            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              {s.active_today
                ? 'Bagus — Anda sudah belajar hari ini. Lanjutkan dengan micro-lesson berikutnya.'
                : 'Satu micro-lesson singkat sudah cukup untuk hari ini. Tanpa tekanan, dengan konsistensi lembut.'}
            </p>

            <Link
              href="/me/streak"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              <CalendarDaysIcon className="size-4" />
              Lihat kalender streak
            </Link>
          </div>

          <div className="w-full shrink-0 lg:max-w-xs">
            <StreakHeatmap days={s.calendar.slice(-14)} compact className="justify-end" />
          </div>
        </div>

        {items.length > 0 ? (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {items.map((m: MicroSummary) => (
              <li key={m.slug}>
                <Link
                  href={`/micro/${m.slug}`}
                  className="group flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/90 dark:hover:border-primary-700"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-white">
                    <AcademicCapIcon className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-900 group-hover:text-primary-600 dark:text-neutral-100">
                      {m.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                      <ClockIcon className="size-3.5" />
                      ~{m.duration_min} menit
                      {m.has_quiz && (
                        <Badge color="sky" className="!py-0">
                          <PuzzlePieceIcon className="size-3" />
                          Quiz
                        </Badge>
                      )}
                    </p>
                  </div>
                  <ArrowRightIcon className="size-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-primary-200 bg-white/60 px-4 py-6 text-center text-sm text-neutral-600 dark:border-primary-800 dark:bg-neutral-900/40 dark:text-neutral-400">
            Semua micro-lesson hari ini sudah selesai. Besok ada unit baru, atau lanjutkan course penuh di{' '}
            <Link href="/learn" className="font-medium text-primary-600 hover:underline">
              Belajar
            </Link>
            .
          </div>
        )}

        {items.length > 0 && !s.active_today && (
          <div className="mt-4">
            <ButtonPrimary href={`/micro/${items[0].slug}`} className="group">
              Mulai micro-lesson
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" data-slot="icon" />
            </ButtonPrimary>
          </div>
        )}
      </div>
    </section>
  )
}
