'use client'

import { factoryGradient } from '@/components/common/featureGradients'
import { CheckCircleIcon, ChartBarSquareIcon, SparklesIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export function AnalyticsConceptSection() {
  return (
    <section className="space-y-6">
      <div className={factoryGradient.conceptBr}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-orange-500 text-white">
            <ChartBarSquareIcon className="size-5" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Ruang Analitik — dashboard native</h2>
        </div>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500 dark:text-primary-400" aria-hidden />
            <span className="min-w-0">
              Dashboard membaca tabel{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">gold Parquet</strong>
              {' '}dari run pipeline terbaru — chart via ECharts.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500 dark:text-primary-400" aria-hidden />
            <span className="min-w-0">
              Enam jenis widget: KPI, tabel, line, bar, pie, scatter — builder memilih node gold & kolom query.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500 dark:text-primary-400" aria-hidden />
            <span className="min-w-0">
              Bagikan dashboard publik atau simpan privat untuk tim Anda.
            </span>
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-dashed border-primary-200/80 bg-primary-50/40 p-4 dark:border-neutral-600 dark:bg-neutral-800/60">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-800 dark:text-neutral-100">
          <SparklesIcon className="size-4" aria-hidden />
          Prasyarat data gold
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
          Jalankan pipeline valid hingga status <strong>done</strong> agar lapisan gold tersedia untuk widget.
        </p>
        <Link
          href="/factory/pipelines"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Kelola pipeline →
        </Link>
      </div>
    </section>
  )
}
