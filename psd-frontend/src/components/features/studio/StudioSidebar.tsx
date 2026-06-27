'use client'

import type { CourseSummary, CourseStatus } from '@/types/api'
import clsx from 'clsx'
import Link from 'next/link'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  LightBulbIcon,
  PencilSquareIcon,
  RocketLaunchIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const CREATOR_TIPS = [
  'Mulai dari satu modul pendek — course 30 menit lebih mudah diselesaikan pembelajar daripada marathon 5 jam.',
  'Sertakan contoh nyata berkonteks Indonesia; relevansi lokal meningkatkan engagement.',
  'Video 5–12 menit per pelajaran ideal; pecah materi panjang jadi beberapa lesson.',
  'Tambahkan quiz singkat di akhir modul untuk mengunci pemahaman.',
  'Judul course yang spesifik ("Forecasting UMKM") menarik lebih baik dari judul generik.',
]

const WORKFLOW = [
  { step: 1, title: 'Buat kerangka', desc: 'Judul, slug, dan level course', icon: PencilSquareIcon },
  { step: 2, title: 'Isi materi', desc: 'Modul, video, teks, dan quiz', icon: AcademicCapIcon },
  { step: 3, title: 'Ajukan tinjauan', desc: 'Tim humas PSD memverifikasi', icon: ClipboardDocumentCheckIcon },
  { step: 4, title: 'Terbit!', desc: 'Course tampil di katalog Belajar', icon: RocketLaunchIcon },
]

type Props = {
  className?: string
  courses?: CourseSummary[]
}

function StatTile({
  label,
  value,
  icon,
  accent = 'primary',
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  accent?: 'primary' | 'sky' | 'amber' | 'rose'
}) {
  const accentClass = {
    primary: 'text-primary-600 dark:text-primary-400',
    sky: 'text-sky-600 dark:text-sky-400',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
  }[accent]

  return (
    <div className="rounded-2xl border border-primary-100/80 bg-primary-50/50 p-3 dark:border-primary-900/40 dark:bg-primary-950/20">
      <div className={clsx('flex items-center gap-2', accentClass)}>{icon}</div>
      <p className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  )
}

function countByStatus(courses: CourseSummary[], status: CourseStatus) {
  return courses.filter((c) => (c.status ?? 'draft') === status).length
}

export function StudioSidebar({ className, courses = [] }: Props) {
  const tip = CREATOR_TIPS[new Date().getDate() % CREATOR_TIPS.length]
  const published = countByStatus(courses, 'published')
  const pending = countByStatus(courses, 'pending_review')
  const drafts = countByStatus(courses, 'draft') + countByStatus(courses, 'rejected')
  const totalLessons = courses.reduce((sum, c) => sum + c.lessons_count, 0)

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="Course Anda"
          value={courses.length}
          icon={<AcademicCapIcon className="size-4" />}
          accent="sky"
        />
        <StatTile
          label="Terbit"
          value={published}
          icon={<CheckCircleIcon className="size-4" />}
          accent="primary"
        />
        <StatTile
          label="Menunggu tinjauan"
          value={pending}
          icon={<ClipboardDocumentCheckIcon className="size-4" />}
          accent="amber"
        />
        <StatTile
          label="Total pelajaran"
          value={totalLessons}
          icon={<PencilSquareIcon className="size-4" />}
          accent="rose"
        />
      </div>

      <section className="rounded-2xl border border-primary-200/60 bg-gradient-to-br from-primary-50/90 via-sky-50/50 to-indigo-50/40 p-4 dark:border-primary-800/40 dark:from-primary-950/40 dark:via-neutral-900 dark:to-indigo-950/30">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300">
          <SparklesIcon className="size-4" aria-hidden />
          Keahlian Anda berharga
        </div>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          Setiap course yang Anda buat membuka pintu belajar bagi ribuan praktisi sains data Indonesia.
          Mulai kecil, iterasi, dan lihat dampaknya tumbuh.
        </p>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Alur publikasi</h3>
        <ol className="mt-3 space-y-3">
          {WORKFLOW.map(({ step, title, desc, icon: Icon }) => (
            <li key={step} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                {step}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  <Icon className="size-3.5 text-primary-500" aria-hidden />
                  {title}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {drafts > 0 && (
        <section className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {drafts} course siap dilanjutkan
          </p>
          <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
            Lanjutkan draft atau perbaiki course yang ditolak, lalu ajukan tinjauan ulang.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-800/60">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <LightBulbIcon className="size-4 text-amber-500" />
          Tips instruktur
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{tip}</p>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <UserGroupIcon className="size-4 text-primary-500" />
          Setelah terbit
        </h3>
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
          Pantau pembelajar, lihat progres, dan perbarui materi kapan saja dari builder course.
        </p>
        <Link
          href="/learn"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Lihat katalog Belajar
          <ArrowRightIcon className="size-3" aria-hidden />
        </Link>
      </section>
    </aside>
  )
}

export function studioStatusSummary(courses: CourseSummary[]) {
  const parts: string[] = []
  const published = countByStatus(courses, 'published')
  const pending = countByStatus(courses, 'pending_review')
  if (published) parts.push(`${published} terbit`)
  if (pending) parts.push(`${pending} menunggu tinjauan`)
  const rejected = countByStatus(courses, 'rejected')
  if (rejected) parts.push(`${rejected} perlu perbaikan`)
  return parts.join(' · ') || 'Belum ada course'
}
