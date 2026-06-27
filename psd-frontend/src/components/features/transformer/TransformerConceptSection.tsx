'use client'

import {
  CheckCircleIcon,
  CpuChipIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export function TransformerConceptSection() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50/80 via-white to-sky-50/60 p-6 dark:border-neutral-700 dark:from-neutral-900 dark:via-neutral-800/95 dark:to-indigo-950/40 sm:p-8">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 text-white">
            <CpuChipIcon className="size-5" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Apa itu Ruang Transformer di PSD?</h2>
        </div>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500 dark:text-primary-400" aria-hidden />
            <span className="min-w-0">
              Ruang Transformer adalah{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">etalase kurasi</strong>
              {' '}— satu pintu masuk untuk model, dataset, dan notebook bertema Transformer dengan konteks Indonesia.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500 dark:text-primary-400" aria-hidden />
            <span className="min-w-0">
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">Koleksi</strong> dirangkai tim humas
              PSD agar pemula cepat menemukan aset terpercaya tanpa harus menelusuri seluruh platform.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500 dark:text-primary-400" aria-hidden />
            <span className="min-w-0">
              Bukan mengejar skala ekosistem global — fokus pada{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">penemuan lokal</strong>
              {' '}yang relevan untuk bahasa, domain, dan kebutuhan komunitas PSD.
            </span>
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-dashed border-primary-200/80 bg-primary-50/40 p-4 dark:border-neutral-600 dark:bg-neutral-800/60">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-800 dark:text-neutral-100">
          <SparklesIcon className="size-4" aria-hidden />
          Perbedaan dengan Explore
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
          Explore menampilkan seluruh aset platform. Ruang Transformer menyorot kurasi bertema Transformer —
          model bahasa Indonesia, dataset teks, dan notebook fine-tuning yang sudah disaring tim PSD.
        </p>
        <Link
          href="/collections"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Lihat semua koleksi →
        </Link>
      </div>
    </section>
  )
}
