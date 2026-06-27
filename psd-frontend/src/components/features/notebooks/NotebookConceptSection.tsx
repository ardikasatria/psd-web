'use client'

import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  CodeBracketSquareIcon,
  DocumentDuplicateIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
import { conceptGradientBr, conceptGradientRow } from '@/components/common/featureGradients'
import clsx from 'clsx'

const STEPS = [
  {
    icon: DocumentDuplicateIcon,
    title: 'Temukan',
    desc: 'Jelajahi katalog referensi',
    accent: 'from-primary-400 to-primary-500',
  },
  {
    icon: CodeBracketSquareIcon,
    title: 'Buka Colab',
    desc: 'Fork & jalankan sel',
    accent: 'from-sky-400 to-indigo-500',
  },
  {
    icon: ArrowTopRightOnSquareIcon,
    title: 'Eksperimen',
    desc: 'Modifikasi & catat insight',
    accent: 'from-indigo-400 to-violet-500',
  },
  {
    icon: ShareIcon,
    title: 'Bagikan',
    desc: 'Kontribusi ke komunitas',
    accent: 'from-amber-400 to-primary-500',
  },
] as const

export function NotebookConceptSection() {
  return (
    <section className="space-y-8">
      <div className={conceptGradientBr.notebook}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white">
            <CodeBracketSquareIcon className="size-5" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Apa peran notebook di PSD?</h2>
        </div>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li className="flex gap-2">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500" aria-hidden />
            Notebook PSD adalah <strong>katalog referensi terbuka</strong> — bukan hosting file .ipynb langsung,
            melainkan kurasi dengan link sumber.
          </li>
          <li className="flex gap-2">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500" aria-hidden />
            Jika sumber berupa <strong>GitHub .ipynb</strong>, PSD otomatis menyiapkan tombol{' '}
            <strong>Buka di Colab</strong> untuk latihan tanpa setup lokal.
          </li>
          <li className="flex gap-2">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500" aria-hidden />
            Notebook melengkapi <strong>kursus, data sintesis, kompetisi, dan Ruang Ide</strong> — tempat
            dokumentasi eksperimen nyata.
          </li>
        </ul>
      </div>

      <div className={conceptGradientRow.notebook}>
        <div className="mb-6 text-center">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Alur belajar praktik</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Dari membaca referensi hingga berkontribusi — setiap langkah melatih skill berbeda.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                {i < STEPS.length - 1 && (
                  <div
                    className="pointer-events-none absolute start-[calc(50%+1.75rem)] top-6 hidden h-0.5 w-[calc(100%-3.5rem)] bg-gradient-to-r from-primary-200 to-sky-200 dark:from-primary-800 dark:to-indigo-800 sm:block"
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
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Format URL Colab-ready</h3>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Saat membagikan notebook, gunakan URL GitHub dengan pola berikut agar tombol Colab aktif:
        </p>
        <code className="mt-3 block overflow-x-auto rounded-xl bg-neutral-100 px-4 py-3 font-mono text-xs text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          https://github.com/&#123;owner&#125;/&#123;repo&#125;/blob/&#123;branch&#125;/path/notebook.ipynb
        </code>
      </div>
    </section>
  )
}
