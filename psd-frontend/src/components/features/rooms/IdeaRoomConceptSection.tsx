'use client'

import { conceptGradientBr } from '@/components/common/featureGradients'
import {
  CheckCircleIcon,
  LightBulbIcon,
  SparklesIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export function IdeaRoomConceptSection() {
  return (
    <section className="space-y-6">
      <div className={conceptGradientBr.ideaRoom}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-indigo-500 text-white">
            <LightBulbIcon className="size-5" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Apa itu Ruang Ide di PSD?</h2>
        </div>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500" aria-hidden />
            <span className="min-w-0">
              Ruang Ide adalah{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">ruang kolaborasi terstruktur</strong>
              {' '}— tempat mengajukan masalah nyata, membentuk tim, dan merapikan pemahaman sebelum mengeksekusi solusi data.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500" aria-hidden />
            <span className="min-w-0">
              Fase <strong className="font-semibold text-neutral-900 dark:text-neutral-100">framing</strong> mengumpulkan
              sudut pandang tim — komponen masalah, kebutuhan data, dan batasan dirumuskan bersama sebelum coding.
            </span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500" aria-hidden />
            <span className="min-w-0">
              Hasil ruang bisa berlanjut ke{' '}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">data sintesis, kompetisi, & portofolio</strong>
              {' '}— dari solusi tim menjadi aset terbuka untuk komunitas.
            </span>
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-dashed border-primary-200/80 bg-primary-50/40 p-4 dark:border-neutral-600 dark:bg-neutral-800/60">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-800 dark:text-neutral-100">
          <SparklesIcon className="size-4" aria-hidden />
          Perbedaan dengan kompetisi
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
          Kompetisi fokus pada evaluasi submission individual/tim dengan leaderboard tetap. Ruang Ide lebih dini —
          kolaboratif, iteratif, dan sering melahirkan data sintesis atau tantangan kompetisi baru. Lihat alur fase di
          bawah sebelum memilih ruang yang cocok.
        </p>
        <Link
          href="/competitions"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          <TrophyIcon className="size-3.5" aria-hidden />
          Bandingkan dengan kompetisi
        </Link>
      </div>
    </section>
  )
}
