'use client'

import { sidebarCalloutClass, sidebarSectionClass } from '@/components/common/SidebarStatTile'
import clsx from 'clsx'
import { BookOpenIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'

const steps = [
  {
    title: 'Tulis materi singkat',
    detail: 'Gunakan Markdown sederhana: judul (##), poin penting, dan contoh praktis. Target baca 3–7 menit.',
  },
  {
    title: 'Tambah quiz (opsional)',
    detail: '2–4 pilihan jawaban per pertanyaan. Quiz membantu peserta mengunci pemahaman.',
  },
  {
    title: 'Publikasikan',
    detail: 'Set status Aktif. Materi masuk antrean belajar harian dan bisa dibuka langsung di /micro/[slug].',
  },
]

export function AdminMicroGuide() {
  return (
    <aside className={clsx(sidebarSectionClass, 'mb-6 space-y-4 p-5 sm:p-6')}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
          <SparklesIcon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Apa itu micro-lesson?</h3>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Unit belajar bite-sized untuk peserta PSD. Tim humas mengkurasi konten edukatif singkat — bukan kursus
            panjang. Materi muncul di widget <strong className="font-medium text-neutral-800 dark:text-neutral-200">Belajar Harian</strong> di dashboard
            dan halaman publik <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">/micro/[slug]</code>.
          </p>
        </div>
      </div>

      <div className={clsx(sidebarCalloutClass, 'space-y-3')}>
        <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
          Alur kerja tim humas
        </p>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-primary-700 ring-1 ring-primary-200 dark:bg-neutral-800 dark:text-primary-300 dark:ring-primary-800">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{step.title}</span>
                <span className="mt-0.5 block text-neutral-600 dark:text-neutral-400">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex gap-2 rounded-xl border border-neutral-200 bg-white/80 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/50">
          <BookOpenIcon className="mt-0.5 size-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
          <span className="text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">Tanpa quiz</span> — materi baca saja, cocok untuk tips atau pengumuman edukatif.
          </span>
        </div>
        <div className="flex gap-2 rounded-xl border border-neutral-200 bg-white/80 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/50">
          <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <span className="text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">Dengan quiz</span> — peserta harus menjawab benar untuk menandai selesai dan melanjutkan streak.
          </span>
        </div>
      </div>
    </aside>
  )
}
