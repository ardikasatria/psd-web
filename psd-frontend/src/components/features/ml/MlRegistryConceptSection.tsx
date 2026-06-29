'use client'

import { modelGradient } from '@/components/common/featureGradients'
import {
  ArrowPathIcon,
  BeakerIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  SignalIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

const STEPS = [
  {
    icon: BeakerIcon,
    title: 'Latih & eksperimen',
    desc: 'Notebook atau kompetisi',
    accent: 'from-violet-400 to-indigo-500',
  },
  {
    icon: CloudArrowUpIcon,
    title: 'Daftarkan versi',
    desc: 'Artefak ke MLflow',
    accent: 'from-indigo-400 to-violet-500',
  },
  {
    icon: ChartBarIcon,
    title: 'Pantau drift',
    desc: 'PSI & akurasi produksi',
    accent: 'from-sky-400 to-indigo-500',
  },
  {
    icon: SignalIcon,
    title: 'Serving',
    desc: 'Endpoint inferensi terkelola',
    accent: 'from-primary-400 to-indigo-500',
  },
] as const

export function MlRegistryConceptSection() {
  return (
    <section className="space-y-8">
      <div className={modelGradient.conceptBr}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 text-white">
            <ArrowPathIcon className="size-5" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
            Apa itu Registry Model?
          </h2>
        </div>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-violet-500" aria-hidden />
            <span className="min-w-0">
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">Katalog model</strong>
              {' '}(<Link href="/models" className="text-primary-600 hover:underline dark:text-primary-400">/models</Link>)
              {' '}adalah repositori terbuka — Registry Model adalah lapisan{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">MLOps</strong> untuk
              melacak versi, metrik, dan artefak di MLflow.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-violet-500" aria-hidden />
            <span className="min-w-0">
              Setiap registry menghubungkan repo model PSD ke{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">MLflow</strong> — Anda
              bisa mendaftarkan versi baru setelah training, membandingkan metrik, dan menandai stage
              (Staging/Production).
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-violet-500" aria-hidden />
            <span className="min-w-0">
              Registry mendukung{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">drift monitoring</strong>
              {' '}(PSI per fitur) dan{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">serving</strong> — alur
              lengkap dari eksperimen hingga inferensi produksi.
            </span>
          </li>
        </ul>
      </div>

      <div className={modelGradient.conceptRow}>
        <div className="mb-6 text-center">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Alur registry di ekosistem PSD
          </h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Dari eksperimen di notebook hingga model terpantau di produksi.
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
          <ChartBarIcon className="size-5 text-indigo-500" aria-hidden />
          Kapan membuat registry?
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          <li>Model sudah dipublikasikan ke katalog dan siap dilacak versinya di MLflow.</li>
          <li>Butuh memantau drift data produksi vs data latih (PSI, alert akurasi).</li>
          <li>Ingin endpoint serving terkelola dengan kuota tier gamifikasi PSD.</li>
          <li>Submission kompetisi perlu direkam sebagai versi model resmi.</li>
        </ul>
      </div>
    </section>
  )
}
