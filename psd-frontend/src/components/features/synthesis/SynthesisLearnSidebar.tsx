'use client'

import { SidebarStatTile, sidebarCalloutClass, sidebarSectionClass, sidebarTipClass } from '@/components/common/SidebarStatTile'
import { getSynthQuota } from '@/lib/api/synthesis'
import { useAuth } from '@/lib/auth/useAuth'
import type { SynthQuota } from '@/types/api'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BeakerIcon,
  BookOpenIcon,
  LightBulbIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

const LEARN_TIPS = [
  'Mulai dari prompt bahasa natural — amati spesifikasi yang dihasilkan AI, lalu edit tipe kolom di mode manual.',
  'Parameter JSON per kolom mengontrol distribusi: min/max untuk angka, categories untuk label diskret.',
  'Data sintesis bagus untuk latihan pipeline — validasi dengan statistik deskriptif sebelum modeling.',
  'Setelah mahir skema manual, coba Ruang Ide: sintesis otomatis dari masalah yang dirumuskan tim.',
]

type Props = {
  className?: string
  onScrollToWorkshop?: () => void
}

export function SynthesisLearnSidebar({ className, onScrollToWorkshop }: Props) {
  const { isLoggedIn } = useAuth()
  const tip = LEARN_TIPS[new Date().getDate() % LEARN_TIPS.length]

  const quota = useQuery({
    queryKey: ['synth-quota'],
    queryFn: getSynthQuota,
    enabled: isLoggedIn,
    staleTime: 30_000,
  })

  const q = quota.data as SynthQuota | undefined

  return (
    <aside className={clsx('space-y-5', className)}>
      {isLoggedIn && q && (
        <div
          className={clsx(
            'rounded-2xl border p-4 text-sm',
            q.plans_left === 0
              ? 'border-amber-200/80 bg-amber-50/80 dark:border-amber-800/60 dark:bg-amber-950/40'
              : 'border-primary-200/80 bg-gradient-to-br from-primary-50/80 to-sky-50/50 dark:border-neutral-700 dark:bg-neutral-800/90 dark:from-neutral-800/90 dark:to-neutral-800/90',
          )}
        >
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">Kuota hari ini</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            <strong>{q.plans_left}</strong>/{q.plans_per_day} rencana AI · maks{' '}
            <strong>{q.max_rows.toLocaleString('id-ID')}</strong> baris
          </p>
          {q.plans_left === 0 && (
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
              Kuota AI habis — latihan skema manual tanpa batas atau{' '}
              <Link href="/leaderboard" className="font-medium underline">
                naik tier
              </Link>
              .
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <SidebarStatTile label="Mode belajar" value="2" icon={<BookOpenIcon className="size-4" />} />
        <SidebarStatTile label="Tipe kolom" value="13" icon={<WrenchScrewdriverIcon className="size-4" />} />
      </div>

      <section className={sidebarSectionClass}>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <AcademicCapIcon className="size-4 text-primary-500" />
          Jalur skill
        </h3>
        <ol className="mt-3 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">1</span>
            Pahami konsep data sintesis
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">2</span>
            Prompt AI → pelajari spec
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">3</span>
            Edit skema manual & params
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">4</span>
            Terbitkan & latihan modeling
          </li>
        </ol>
        {onScrollToWorkshop && (
          <button
            type="button"
            onClick={onScrollToWorkshop}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Mulai workshop
            <ArrowRightIcon className="size-3.5" aria-hidden />
          </button>
        )}
      </section>

      <section className={sidebarSectionClass}>
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Hubungkan belajar</h3>
        <nav className="mt-2 space-y-1">
          <Link href="/idea-rooms" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300">
            <LightBulbIcon className="size-4" />
            Ruang Ide
          </Link>
          <Link href="/learn" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300">
            <AcademicCapIcon className="size-4" />
            Kursus belajar
          </Link>
          <Link href="/competitions" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300">
            <BeakerIcon className="size-4" />
            Kompetisi
          </Link>
        </nav>
      </section>

      <section className={sidebarTipClass}>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-800 dark:text-neutral-100">
          <SparklesIcon className="size-4" aria-hidden />
          Tips praktik
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{tip}</p>
      </section>

      {!isLoggedIn && (
        <Link
          href="/login?next=/synthesis"
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Masuk untuk praktik
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      )}
    </aside>
  )
}
