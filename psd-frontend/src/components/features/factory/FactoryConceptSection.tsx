'use client'

import { factoryGradient } from '@/components/common/featureGradients'
import {
  CheckCircleIcon,
  Cog6ToothIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export function FactoryConceptSection() {
  return (
    <section className="space-y-6">
      <div className={factoryGradient.conceptBr}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
            <Cog6ToothIcon className="size-5" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Apa itu Pabrik Data di PSD?</h2>
        </div>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500 dark:text-primary-400" aria-hidden />
            <span className="min-w-0">
              Pabrik Data adalah{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">fondasi pipeline ETL</strong>
              {' '}— daftarkan dataset sebagai sumber (URI), lalu susun spec DAG yang divalidasi sebelum eksekusi.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500 dark:text-primary-400" aria-hidden />
            <span className="min-w-0">
              Setiap pipeline punya status{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">draft, valid, atau error</strong>
              {' '}— validasi menolak siklus, operasi tak dikenal, dan node melebihi batas tier reputasi Anda.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500 dark:text-primary-400" aria-hidden />
            <span className="min-w-0">
              Editor visual drag-drop hadir di rilis berikutnya — untuk sekarang gunakan{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">editor spec JSON</strong>
              {' '}untuk merancang alur bronze → silver → gold.
            </span>
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-dashed border-primary-200/80 bg-primary-50/40 p-4 dark:border-neutral-600 dark:bg-neutral-800/60">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-800 dark:text-neutral-100">
          <SparklesIcon className="size-4" aria-hidden />
          Mulai dari sumber data
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
          Daftarkan dataset PSD sebagai sumber dengan URI <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-700">psd://dataset/…</code>
          {' '}sebelum menambahkan node source pada pipeline.
        </p>
        <Link
          href="/factory/sources"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Kelola sumber data →
        </Link>
      </div>
    </section>
  )
}
