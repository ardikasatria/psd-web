'use client'

import { factoryGradient } from '@/components/common/featureGradients'
import {
  BoltIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  CpuChipIcon,
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
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Pabrik Data — kanvas ETL</h2>
        </div>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500 dark:text-primary-400" aria-hidden />
            <span className="min-w-0">
              Susun pipeline secara <strong className="font-semibold text-neutral-900 dark:text-neutral-100">visual di kanvas</strong>
              {' '}— source dari dataset, transform, hingga sink gold yang jadi aset dataset.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500 dark:text-primary-400" aria-hidden />
            <span className="min-w-0">
              Pilih engine <strong className="font-semibold text-neutral-900 dark:text-neutral-100">DuckDB (SQL)</strong>
              {' '}untuk data cepat, atau <strong className="font-semibold text-neutral-900 dark:text-neutral-100">Spark (PySpark)</strong>
              {' '}untuk volume besar — atau biarkan <strong>Auto</strong> memilih.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500 dark:text-primary-400" aria-hidden />
            <span className="min-w-0">
              Validasi menampilkan SQL/PySpark hasil kompilasi; pratinjau sampel baris; jalankan untuk materialisasi ke dataset & analitik.
            </span>
          </li>
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <BoltIcon className="size-4" />
            DuckDB — SQL
          </div>
          <p className="mt-2 text-xs leading-relaxed text-amber-800/90 dark:text-amber-300/90">
            Interaktif & hemat. Node SQL SELECT-only (tier menengah+).
          </p>
        </div>
        <div className="rounded-2xl border border-violet-200/70 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-900 dark:text-violet-200">
            <CpuChipIcon className="size-4" />
            Spark — PySpark
          </div>
          <p className="mt-2 text-xs leading-relaxed text-violet-800/90 dark:text-violet-300/90">
            Data besar. Node kode .py di tier lanjut + akses kernel.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-primary-200/80 bg-primary-50/40 p-4 dark:border-neutral-600 dark:bg-neutral-800/60">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-800 dark:text-neutral-100">
          <SparklesIcon className="size-4" aria-hidden />
          Mulai dari sumber data
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
          Daftarkan dataset (termasuk hasil{' '}
          <Link href="/harvest" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            Ruang Panen Data
          </Link>
          ) sebagai sumber sebelum menyusun pipeline.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/factory/sources"
            className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Kelola sumber data →
          </Link>
          <Link
            href="/factory/panduan"
            className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Panduan lengkap →
          </Link>
        </div>
      </div>
    </section>
  )
}
