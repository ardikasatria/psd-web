'use client'

import {
  ArrowDownTrayIcon,
  BeakerIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
import { modelGradient } from '@/components/common/featureGradients'
import clsx from 'clsx'

const STEPS = [
  {
    icon: MagnifyingGlassIcon,
    title: 'Jelajahi',
    desc: 'Temukan baseline & referensi',
    accent: 'from-violet-400 to-indigo-500',
  },
  {
    icon: BeakerIcon,
    title: 'Evaluasi',
    desc: 'Bandingkan metrik & dataset',
    accent: 'from-indigo-400 to-violet-500',
  },
  {
    icon: CloudArrowUpIcon,
    title: 'Deploy / fork',
    desc: 'Unduh & integrasikan',
    accent: 'from-sky-400 to-indigo-500',
  },
  {
    icon: ShareIcon,
    title: 'Kontribusi',
    desc: 'Publikasikan model Anda',
    accent: 'from-primary-400 to-indigo-500',
  },
] as const

export function ModelConceptSection() {
  return (
    <section className="space-y-8">
      <div className={modelGradient.conceptBr}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 text-white">
            <BeakerIcon className="size-5" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Apa peran model di PSD?</h2>
        </div>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-violet-500" aria-hidden />
            <span className="min-w-0">
              Katalog model PSD adalah <strong className="font-semibold text-neutral-900 dark:text-neutral-100">repositori terbuka</strong>
              {' '}untuk baseline, checkpoint, dan artefak inferensi — terhubung ke dataset, notebook, dan kompetisi.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-violet-500" aria-hidden />
            <span className="min-w-0">
              Setiap model menampilkan <strong className="font-semibold text-neutral-900 dark:text-neutral-100">metrik evaluasi</strong>
              {' '}(akurasi, F1, MAPE) agar Anda bisa membandingkan sebelum fork atau deploy.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-violet-500" aria-hidden />
            <span className="min-w-0">
              Model melengkapi alur{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">dataset → eksperimen → kompetisi</strong>
              {' '}— dari latihan hingga submission leaderboard.
            </span>
          </li>
        </ul>
      </div>

      <div className={modelGradient.conceptRow}>
        <div className="mb-6 text-center">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Alur model di ekosistem PSD</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Dari eksplorasi baseline hingga publikasi — setiap langkah memperkuat skill berbeda.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                {i < STEPS.length - 1 && (
                  <div
                    className="pointer-events-none absolute start-[calc(50%+1.75rem)] top-6 hidden h-0.5 w-[calc(100%-3.5rem)] bg-gradient-to-r from-violet-200 to-indigo-200 dark:from-violet-800 dark:to-indigo-800 sm:block"
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
          <ArrowDownTrayIcon className="size-5 text-indigo-500" aria-hidden />
          Kapan pakai model dari katalog?
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          <li>Butuh baseline cepat untuk kompetisi atau Ruang Ide — fork dan fine-tune.</li>
          <li>Ingin membandingkan arsitektur (Transformer vs CNN vs tabular) pada domain yang sama.</li>
          <li>Siap deploy inferensi ringan (FastText, CNN kecil) untuk UMKM atau pertanian.</li>
        </ul>
      </div>
    </section>
  )
}
