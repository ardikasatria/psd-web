'use client'

import { sidebarGradientBr } from '@/components/common/featureGradients'
import { getCourses, getMyLearning } from '@/lib/api/learn'
import { useAuth } from '@/lib/auth/useAuth'
import { useMe } from '@/lib/api/dashboard'
import { isStaff } from '@/lib/auth/roles'
import type { LearningPathSummary, LearningProgress } from '@/types/api'
import { Button } from '@/shared/Button'
import clsx from 'clsx'
import Link from 'next/link'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BookOpenIcon,
  LightBulbIcon,
  MapIcon,
  PlayCircleIcon,
  SparklesIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'

const PATH_TIPS = [
  'Pilih jalur yang selaras dengan tujuan karier — Anda tetap bisa mengambil kursus di luar jalur kapan saja.',
  'Ikuti urutan course dalam jalur; materi saling membangun dari dasar ke lanjutan.',
  'Gabungkan jalur + Ruang Ide untuk latihan proyek nyata setelah menyelesaikan modul inti.',
  'Satu jalur selesai ≠ harus mahir; ulangi pelajaran sulit dan lanjut ke course pendamping.',
]

type Props = {
  className?: string
  paths?: LearningPathSummary[]
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
  accent?: 'primary' | 'sky' | 'indigo'
}) {
  const accentClass = {
    primary: 'text-primary-600 dark:text-primary-400',
    sky: 'text-sky-600 dark:text-sky-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
  }[accent]

  return (
    <div className="rounded-2xl border border-primary-100/80 bg-primary-50/50 p-3 dark:border-primary-900/40 dark:bg-primary-950/20">
      <div className={clsx('flex items-center gap-2', accentClass)}>{icon}</div>
      <p className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  )
}

function ContinueMini({ item }: { item: LearningProgress }) {
  const href = item.next_lesson_id
    ? `/learn/${item.course.slug}/${item.next_lesson_id}`
    : `/learn/${item.course.slug}`

  return (
    <Link
      href={href}
      className="block rounded-xl border border-primary-100/80 bg-white p-2.5 text-sm transition hover:border-primary-200 dark:border-primary-900/40 dark:bg-neutral-800/80"
    >
      <p className="line-clamp-1 font-medium text-neutral-900 dark:text-neutral-100">{item.course.title}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{item.percent}% selesai</p>
    </Link>
  )
}

export function PathsSidebar({ className, paths = [] }: Props) {
  const { isLoggedIn } = useAuth()
  const me = useMe()
  const tip = PATH_TIPS[new Date().getDate() % PATH_TIPS.length]
  const totalCourses = paths.reduce((sum, p) => sum + p.courses_count, 0)
  const isInstructor = me.data?.user?.is_instructor || isStaff(me.data?.user)

  const myLearning = useQuery({
    queryKey: ['my-learning'],
    queryFn: getMyLearning,
    enabled: isLoggedIn,
    staleTime: 60_000,
  })

  const catalog = useQuery({
    queryKey: ['courses', 'paths-sidebar-count'],
    queryFn: () => getCourses({ page_size: 1 }),
    staleTime: 120_000,
  })

  const active = (myLearning.data?.items ?? []).filter((i) => !i.expired && i.percent < 100)

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="Jalur tersedia"
          value={paths.length || '—'}
          icon={<MapIcon className="size-4" />}
          accent="sky"
        />
        <StatTile
          label="Kursus dalam jalur"
          value={totalCourses || '—'}
          icon={<Squares2X2Icon className="size-4" />}
          accent="indigo"
        />
        <StatTile
          label="Katalog kursus"
          value={catalog.data?.total ?? '—'}
          icon={<BookOpenIcon className="size-4" />}
          accent="primary"
        />
        <StatTile
          label="Sedang dipelajari"
          value={isLoggedIn ? active.length : '—'}
          icon={<PlayCircleIcon className="size-4" />}
        />
      </div>

      <section className={sidebarGradientBr.learn}>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300">
          <SparklesIcon className="size-4" aria-hidden />
          Peta perjalanan Anda
        </div>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          Jalur belajar memberi arah — dari pemula hingga spesialis — tanpa kehilangan kebebasan eksplorasi kursus
          individual.
        </p>
      </section>

      {isLoggedIn && active.length > 0 && (
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <PlayCircleIcon className="size-4 text-primary-500" />
            Lanjutkan belajar
          </h3>
          <div className="mt-3 space-y-2">
            {active.slice(0, 2).map((item) => (
              <ContinueMini key={item.course.slug} item={item} />
            ))}
          </div>
          <Link
            href="/learn"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Semua kursus
            <ArrowRightIcon className="size-3" aria-hidden />
          </Link>
        </section>
      )}

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Navigasi belajar</h3>
        <ul className="mt-3 space-y-1">
          <li>
            <Link
              href="/learn"
              className="flex items-center justify-between rounded-xl px-2 py-2 text-sm text-neutral-700 transition hover:bg-primary-50/80 dark:text-neutral-300 dark:hover:bg-neutral-700/50"
            >
              <span className="inline-flex items-center gap-2">
                <AcademicCapIcon className="size-4 text-primary-500" />
                Katalog Belajar
              </span>
              <ArrowRightIcon className="size-3.5 text-neutral-400" />
            </Link>
          </li>
          {isInstructor && (
            <li>
              <Link
                href="/studio"
                className="flex items-center justify-between rounded-xl px-2 py-2 text-sm text-neutral-700 transition hover:bg-primary-50/80 dark:text-neutral-300 dark:hover:bg-neutral-700/50"
              >
                <span className="inline-flex items-center gap-2">
                  <SparklesIcon className="size-4 text-primary-500" />
                  Studio Instruktur
                </span>
                <ArrowRightIcon className="size-3.5 text-neutral-400" />
              </Link>
            </li>
          )}
          <li>
            <Link
              href="/idea-rooms"
              className="flex items-center justify-between rounded-xl px-2 py-2 text-sm text-neutral-700 transition hover:bg-primary-50/80 dark:text-neutral-300 dark:hover:bg-neutral-700/50"
            >
              <span className="inline-flex items-center gap-2">
                <LightBulbIcon className="size-4 text-violet-500" />
                Ruang Ide
              </span>
              <ArrowRightIcon className="size-3.5 text-neutral-400" />
            </Link>
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-800/60">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <LightBulbIcon className="size-4 text-amber-500" />
          Tips memilih jalur
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{tip}</p>
      </section>

      {!isLoggedIn && (
        <div className="rounded-2xl border border-dashed border-primary-300/70 bg-primary-50/40 p-4 dark:border-primary-800 dark:bg-primary-950/20">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Progres tersimpan</p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            Masuk untuk melacak course dalam jalur dan melanjutkan dari titik terakhir.
          </p>
          <Button href="/login?next=/paths" className="mt-3 !text-xs">
            Masuk
          </Button>
        </div>
      )}
    </aside>
  )
}
