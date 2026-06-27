'use client'

import {
  BeakerIcon,
  CheckCircleIcon,
  FolderIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  ShareIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { conceptGradientBr, conceptGradientRow } from '@/components/common/featureGradients'
import clsx from 'clsx'

const STEPS = [
  {
    icon: LightBulbIcon,
    title: 'Rencana',
    desc: 'Definisikan tujuan & scope',
    accent: 'from-primary-400 to-indigo-500',
  },
  {
    icon: WrenchScrewdriverIcon,
    title: 'Bangun',
    desc: 'Hubungkan data & model',
    accent: 'from-emerald-400 to-primary-500',
  },
  {
    icon: RocketLaunchIcon,
    title: 'Integrasi',
    desc: 'Dashboard, API, demo',
    accent: 'from-teal-400 to-indigo-500',
  },
  {
    icon: ShareIcon,
    title: 'Bagikan',
    desc: 'Publikasikan ke komunitas',
    accent: 'from-indigo-400 to-primary-500',
  },
] as const

export function ProjectConceptSection() {
  return (
    <section className="space-y-8">
      <div className={conceptGradientBr.project}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-emerald-500 text-white">
            <FolderIcon className="size-5" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Apa peran proyek di PSD?</h2>
        </div>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500" aria-hidden />
            <span className="min-w-0">
              Proyek PSD adalah <strong className="font-semibold text-neutral-900 dark:text-neutral-100">workspace end-to-end</strong>
              {' '}— tempat menggabungkan dataset, model, notebook, dan dashboard dalam satu alur kerja.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500" aria-hidden />
            <span className="min-w-0">
              Setiap proyek bisa menampilkan{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">stack teknologi & aset terhubung</strong>
              {' '}— memudahkan tim mengevaluasi kelengkapan solusi sebelum fork.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500" aria-hidden />
            <span className="min-w-0">
              Proyek melengkapi alur{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">Ruang Ide → kompetisi → portofolio</strong>
              {' '}— dokumentasi nyata hasil kolaborasi dan eksperimen tim.
            </span>
          </li>
        </ul>
      </div>

      <div className={conceptGradientRow.project}>
        <div className="mb-6 text-center">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Alur proyek di ekosistem PSD</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Dari ide hingga publikasi — setiap langkah membangun solusi yang utuh.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                {i < STEPS.length - 1 && (
                  <div
                    className="pointer-events-none absolute start-[calc(50%+1.75rem)] top-6 hidden h-0.5 w-[calc(100%-3.5rem)] bg-gradient-to-r from-primary-200 to-emerald-200 dark:from-primary-800 dark:to-emerald-800 sm:block"
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
          <BeakerIcon className="size-5 text-primary-500" aria-hidden />
          Kapan pakai proyek dari katalog?
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          <li>Butuh referensi pipeline lengkap — dari ETL hingga dashboard atau API inferensi.</li>
          <li>Ingin belajar stack tim lain (Streamlit, FastAPI, React) pada domain UMKM atau pertanian.</li>
          <li>Siap mendokumentasikan hasil Ruang Ide atau kompetisi sebagai portofolio tim.</li>
        </ul>
      </div>
    </section>
  )
}
