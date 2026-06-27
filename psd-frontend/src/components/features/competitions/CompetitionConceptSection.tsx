'use client'

import {
  ArrowUpTrayIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CubeIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { conceptGradientBr, conceptGradientRow } from '@/components/common/featureGradients'
import clsx from 'clsx'
import Link from 'next/link'

const STEPS = [
  {
    icon: MagnifyingGlassIcon,
    title: 'Jelajahi',
    desc: 'Pilih kompetisi & baca rules',
    accent: 'from-amber-400 to-orange-500',
  },
  {
    icon: CubeIcon,
    title: 'Siapkan',
    desc: 'Unduh data & baseline model',
    accent: 'from-orange-400 to-primary-500',
  },
  {
    icon: ArrowUpTrayIcon,
    title: 'Submit',
    desc: 'Unggah prediksi / file',
    accent: 'from-primary-400 to-indigo-500',
  },
  {
    icon: ChartBarIcon,
    title: 'Leaderboard',
    desc: 'Pantau skor & reputasi',
    accent: 'from-indigo-400 to-violet-500',
  },
] as const

export function CompetitionConceptSection() {
  return (
    <section className="space-y-6">
      <div className={conceptGradientBr.competition}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
            <TrophyIcon className="size-5" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Apa itu kompetisi di PSD?</h2>
        </div>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
            <span className="min-w-0">
              Kompetisi PSD adalah{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">tantangan sains data terbuka</strong>
              {' '}dengan konteks lokal — UMKM, pertanian, NLP Indonesia, dan domain lain yang relevan.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
            <span className="min-w-0">
              Setiap kompetisi menyediakan{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">dataset, metrik evaluasi, & leaderboard</strong>
              {' '}— Anda fokus pada modeling, bukan administrasi.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
            <span className="min-w-0">
              Kompetisi terhubung ke{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">quest, reputasi, Ruang Ide, & portofolio</strong>
              {' '}— bukti skill nyata yang terlihat komunitas.
            </span>
          </li>
        </ul>
      </div>

      <div className={conceptGradientRow.competition}>
        <div className="mb-6 text-center">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Alur ikut kompetisi</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Dari menemukan tantangan hingga naik peringkat — empat langkah standar di PSD.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                {i < STEPS.length - 1 && (
                  <div
                    className="pointer-events-none absolute start-[calc(50%+1.75rem)] top-6 hidden h-0.5 w-[calc(100%-3.5rem)] bg-gradient-to-r from-amber-200 to-orange-200 dark:from-amber-800 dark:to-orange-800 sm:block"
                    aria-hidden
                  />
                )}
                <div
                  className={clsx(
                    'flex size-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                    step.accent,
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </div>
                <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{step.title}</p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{step.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800/90">
        <h3 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
          <LightBulbIcon className="size-5 text-amber-500" aria-hidden />
          Tips sebelum submit
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          <li>Baca rules & format file submission — setiap kompetisi punya metrik dan batas unggah harian.</li>
          <li>Manfaatkan dataset dan model baseline dari katalog PSD untuk memulai lebih cepat.</li>
          <li>Submission pertama Anda juga melengkapi quest &quot;Mulai Perjalanan&quot; (+30 reputasi).</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium">
          <Link href="/datasets" className="text-primary-600 hover:underline dark:text-primary-400">
            Katalog dataset →
          </Link>
          <Link href="/models" className="text-primary-600 hover:underline dark:text-primary-400">
            Katalog model →
          </Link>
          <Link href="/leaderboard" className="text-primary-600 hover:underline dark:text-primary-400">
            Leaderboard →
          </Link>
          <Link href="/idea-rooms" className="text-primary-600 hover:underline dark:text-primary-400">
            Ruang Ide →
          </Link>
          <Link href="/dashboard/competitions" className="text-primary-600 hover:underline dark:text-primary-400">
            Ajukan kompetisi →
          </Link>
        </div>
      </div>
    </section>
  )
}
