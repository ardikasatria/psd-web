'use client'

import {
  BeakerIcon,
  CheckCircleIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

const STEPS = [
  {
    icon: MagnifyingGlassIcon,
    title: 'Temukan',
    desc: 'Jelajahi katalog terbuka',
    accent: 'from-sky-400 to-indigo-500',
  },
  {
    icon: CubeIcon,
    title: 'Eksplorasi',
    desc: 'Unduh & EDA di notebook',
    accent: 'from-indigo-400 to-sky-500',
  },
  {
    icon: BeakerIcon,
    title: 'Latih model',
    desc: 'Baseline ke kompetisi',
    accent: 'from-primary-400 to-indigo-500',
  },
  {
    icon: ShareIcon,
    title: 'Kontribusi',
    desc: 'Publikasikan dataset Anda',
    accent: 'from-blue-400 to-indigo-500',
  },
] as const

export function DatasetConceptSection() {
  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-primary-200/60 bg-gradient-to-br from-sky-50/80 via-white to-indigo-50/60 p-6 dark:border-primary-900/40 dark:from-sky-950/25 dark:via-neutral-900 dark:to-indigo-950/20 sm:p-8">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white">
            <CubeIcon className="size-5" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Apa peran dataset di PSD?</h2>
        </div>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-sky-500" aria-hidden />
            <span className="min-w-0">
              Katalog dataset PSD adalah <strong className="font-semibold text-neutral-900 dark:text-neutral-100">repositori data terbuka</strong>
              {' '}— dari survei UMKM, citra pertanian, hingga korpus bahasa daerah, siap untuk EDA dan pelatihan model.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-sky-500" aria-hidden />
            <span className="min-w-0">
              Dataset <strong className="font-semibold text-neutral-900 dark:text-neutral-100">sintesis dari Ruang Ide</strong>
              {' '}ditandai khusus — aman untuk latihan kompetisi tanpa data sensitif asli.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-sky-500" aria-hidden />
            <span className="min-w-0">
              Dataset menjadi fondasi alur{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">eksplorasi → model → kompetisi</strong>
              {' '}— terhubung ke notebook, sintesis, dan leaderboard.
            </span>
          </li>
        </ul>
      </div>

      <div className="rounded-3xl border border-primary-200/60 bg-gradient-to-r from-indigo-50/60 via-white to-sky-50/50 p-6 dark:border-primary-900/40 dark:from-indigo-950/20 dark:via-neutral-900 dark:to-sky-950/20 sm:p-8">
        <div className="mb-6 text-center">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Alur dataset di ekosistem PSD</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Dari menemukan data hingga berkontribusi — setiap langkah membangun skill berbeda.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                {i < STEPS.length - 1 && (
                  <div
                    className="pointer-events-none absolute start-[calc(50%+1.75rem)] top-6 hidden h-0.5 w-[calc(100%-3.5rem)] bg-gradient-to-r from-sky-200 to-indigo-200 dark:from-sky-800 dark:to-indigo-800 sm:block"
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

      <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
          <SparklesIcon className="size-5 text-sky-500" aria-hidden />
          Kapan pakai dataset dari katalog?
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          <li>Butuh data real untuk latihan NLP, CV, atau tabular pada domain Indonesia.</li>
          <li>Ingin baseline kompetisi — unduh, eksplorasi di notebook, lalu submit model.</li>
          <li>Perlu data sintesis aman dari Ruang Ide untuk eksperimen tanpa PII.</li>
        </ul>
      </div>
    </section>
  )
}
