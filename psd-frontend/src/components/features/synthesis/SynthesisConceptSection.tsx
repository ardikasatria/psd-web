'use client'

import { darkPanelClass, synthesisGradient } from '@/components/common/featureGradients'
import { SyntheticBadge } from '@/components/common/SyntheticBadge'
import {
  ArrowPathIcon,
  BeakerIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

const COMPARE = [
  {
    label: 'Data nyata',
    points: ['Dari sumber resmi atau lapangan', 'Memuat informasi sensitif & bias historis', 'Akses sering terbatas (NDA, regulasi)'],
    tone: 'neutral' as const,
  },
  {
    label: 'Data sintesis PSD',
    points: ['Dibuat oleh generator dari spesifikasi', 'Tidak mengklaim identitas orang nyata', 'Aman untuk latihan, prototyping, & pengajaran'],
    tone: 'primary' as const,
  },
]

const USE_CASES = [
  {
    icon: BeakerIcon,
    title: 'Latihan pipeline',
    desc: 'Uji ETL, feature engineering, dan notebook sebelum sentuh data produksi.',
  },
  {
    icon: SparklesIcon,
    title: 'Prototipe cepat',
    desc: 'Validasi ide model saat data asli belum tersedia atau masih dalam framing.',
  },
  {
    icon: ArrowPathIcon,
    title: 'Ruang Ide & kompetisi',
    desc: 'Tim merumuskan masalah → PSD menghasilkan dataset latihan dengan locale Indonesia.',
  },
]

export function SynthesisConceptSection() {
  return (
    <section className="space-y-8">
      <div className={synthesisGradient.conceptBr}>
        <div className="flex flex-wrap items-start gap-3">
          <SyntheticBadge />
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Apa itu data sintesis?</h2>
        </div>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
          <strong>Data sintesis</strong> adalah dataset yang <em>dibuat secara artifisial</em> mengikuti aturan
          dan struktur yang Anda tentukan — bukan salinan baris demi baris dari database nyata. Generator PSD
          memproduksi nilai dengan locale Indonesia (nama, kota, format angka) sehingga terasa realistis untuk
          latihan, tanpa mengekspos data sensitif.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          Alurnya: Anda deskripsikan kebutuhan (prompt) atau tulis skema kolom manual → AI (opsional) merancang
          spesifikasi → generator lokal membuat ribuan baris → Anda pratinjau, unduh CSV, dan terbitkan sebagai
          dataset di portofolio — selalu ditandai <strong>Data Sintesis</strong>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {COMPARE.map((col) => (
          <div
            key={col.label}
            className={clsx(
              col.tone === 'primary' ? synthesisGradient.accentCard : darkPanelClass,
            )}
          >
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{col.label}</h3>
            <ul className="mt-3 space-y-2">
              {col.points.map((p) => (
                <li key={p} className="flex gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary-500" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={synthesisGradient.warning}>
        <div className="flex gap-3">
          <ExclamationTriangleIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Yang perlu Anda ingat</p>
            <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-100/90">
              Data sintesis <strong>bukan</strong> data resmi BPS, BMKG, atau instansi pemerintah. Jangan
              presentasikan hasil model pada data sintesis sebagai bukti kebijakan nyata — gunakan untuk
              belajar, eksperimen, dan fondasi sebelum data riil tersedia.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Kapan data sintesis membantu skill Anda?</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {USE_CASES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className={clsx(darkPanelClass, 'p-4')}
            >
              <Icon className="size-6 text-primary-600 dark:text-primary-400" aria-hidden />
              <p className="mt-3 font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
