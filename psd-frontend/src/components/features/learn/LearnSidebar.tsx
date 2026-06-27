'use client'

import { sidebarGradientBr } from '@/components/common/featureGradients'
import { SidebarStatTile, sidebarTipClass } from '@/components/common/SidebarStatTile'
import { getLearningPaths, getMyLearning } from '@/lib/api/learn'
import { useAuth } from '@/lib/auth/useAuth'
import type { LearningPathSummary, LearningProgress } from '@/types/api'
import { Button } from '@/shared/Button'
import clsx from 'clsx'
import Link from 'next/link'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BookOpenIcon,
  ChartBarIcon,
  FireIcon,
  LightBulbIcon,
  MapIcon,
  PlayCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'

const STUDY_TIPS = [
  'Pelajari 25 menit, istirahat 5 menit — teknik Pomodoro cocok untuk materi video.',
  'Catat tiga hal baru setiap sesi belajar; ringkasan singkat membantu ingatan jangka panjang.',
  'Selesaikan satu pelajaran kecil dulu — momentum lebih penting dari durasi marathon.',
  'Ulangi quiz yang salah; kesalahan adalah sinyal bagian mana yang perlu diperkuat.',
]

type Props = {
  className?: string
  totalCourses?: number
}

function ContinueCard({ item }: { item: LearningProgress }) {
  const href = item.next_lesson_id
    ? `/learn/${item.course.slug}/${item.next_lesson_id}`
    : `/learn/${item.course.slug}`

  return (
    <Link
      href={href}
      className="group block rounded-xl border border-primary-100/80 bg-white p-3 transition hover:border-primary-200 hover:shadow-sm dark:border-primary-900/40 dark:bg-neutral-800/80 dark:hover:border-primary-800"
    >
      <p className="line-clamp-2 text-sm font-medium text-neutral-900 group-hover:text-primary-700 dark:text-neutral-100 dark:group-hover:text-primary-300">
        {item.course.title}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-100 dark:bg-neutral-700">
        <div
          className="h-full rounded-full bg-primary-500 transition-all dark:bg-primary-400"
          style={{ width: `${item.percent}%` }}
        />
      </div>
      <p className="mt-1.5 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>
          {item.completed}/{item.total} pelajaran · {item.percent}%
        </span>
        <span className="inline-flex items-center gap-0.5 font-medium text-primary-600 dark:text-primary-400">
          {item.next_lesson_id ? 'Lanjut' : 'Buka'}
          <ArrowRightIcon className="size-3" aria-hidden />
        </span>
      </p>
    </Link>
  )
}

export function LearnSidebar({ className, totalCourses = 0 }: Props) {
  const { isLoggedIn } = useAuth()
  const tip = STUDY_TIPS[new Date().getDate() % STUDY_TIPS.length]

  const myLearning = useQuery({
    queryKey: ['my-learning'],
    queryFn: getMyLearning,
    enabled: isLoggedIn,
    staleTime: 60_000,
  })

  const paths = useQuery({
    queryKey: ['learning-paths', 'sidebar'],
    queryFn: () => getLearningPaths({ page_size: 5 }),
    staleTime: 120_000,
  })

  const items = myLearning.data?.items ?? []
  const activeCourses = items.filter((i) => !i.expired && i.percent < 100)
  const lessonsDone = items.reduce((sum, i) => sum + i.completed, 0)
  const avgProgress = items.length
    ? Math.round(items.reduce((sum, i) => sum + i.percent, 0) / items.length)
    : 0

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-2 gap-2">
        <SidebarStatTile
          label="Kursus tersedia"
          value={totalCourses || '—'}
          icon={<BookOpenIcon className="size-4" />}
          accent="sky"
        />
        <SidebarStatTile
          label="Pelajaran selesai"
          value={isLoggedIn ? lessonsDone : '—'}
          icon={<ChartBarIcon className="size-4" />}
          accent="indigo"
        />
        <SidebarStatTile
          label="Kursus aktif"
          value={isLoggedIn ? activeCourses.length : '—'}
          icon={<PlayCircleIcon className="size-4" />}
        />
        <SidebarStatTile
          label="Rata-rata progres"
          value={isLoggedIn && items.length ? `${avgProgress}%` : '—'}
          icon={<FireIcon className="size-4" />}
          accent="amber"
        />
      </div>

      <section className={sidebarGradientBr.learn}>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300">
          <SparklesIcon className="size-4" aria-hidden />
          Semangat belajar
        </div>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          Setiap langkah kecil menuju keahlian baru. Konsisten 20 menit sehari lebih baik dari marathon
          sekali seminggu.
        </p>
      </section>

      {isLoggedIn && activeCourses.length > 0 && (
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800/90">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <PlayCircleIcon className="size-4 text-primary-500" />
            Lanjutkan belajar
          </h3>
          <div className="mt-3 space-y-2">
            {activeCourses.slice(0, 3).map((item) => (
              <ContinueCard key={item.course.slug} item={item} />
            ))}
          </div>
          {items.length > 3 && (
            <Link
              href="/dashboard"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              Lihat semua di dasbor
              <ArrowRightIcon className="size-3" aria-hidden />
            </Link>
          )}
        </section>
      )}

      {!isLoggedIn && (
        <div className={sidebarTipClass}>
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Progres terlacak</p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            Masuk untuk menyimpan progres, melanjutkan kursus, dan mendapat rekomendasi jalur belajar.
          </p>
          <Button href="/login?next=/learn" className="mt-3 !text-xs">
            Masuk untuk belajar
          </Button>
        </div>
      )}

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <MapIcon className="size-4 text-primary-500" />
          Jalur belajar
        </h3>
        <ul className="mt-3 space-y-2">
          {(paths.data?.items ?? []).slice(0, 4).map((p: LearningPathSummary) => (
            <li key={p.slug}>
              <Link
                href={`/paths/${p.slug}`}
                className="flex items-start justify-between gap-2 rounded-xl p-2 transition hover:bg-primary-50/80 dark:hover:bg-neutral-700/50"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">{p.title}</span>
                  <span className="text-xs text-neutral-500">{p.courses_count} kursus</span>
                </span>
                <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-neutral-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/paths"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Semua jalur
          <ArrowRightIcon className="size-3" aria-hidden />
        </Link>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-800/60">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <LightBulbIcon className="size-4 text-amber-500" />
          Tips produktif
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{tip}</p>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Ingin mengajar?</p>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Bagikan keahlian lewat course video & materi tertulis di PSD.
        </p>
        <Link
          href="/instructor/apply"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          <AcademicCapIcon className="size-3.5" aria-hidden />
          Daftar instruktur
        </Link>
      </section>
    </aside>
  )
}
