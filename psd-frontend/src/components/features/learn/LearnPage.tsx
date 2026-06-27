'use client'

import { heroGradient } from '@/components/common/featureGradients'
import { CourseCard } from '@/components/features/CourseCard'
import { LearnSidebar } from '@/components/features/learn/LearnSidebar'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { useMe } from '@/lib/api/dashboard'
import { getCourses } from '@/lib/api/learn'
import { getMyInstructorApplication } from '@/lib/api/instructors'
import { CourseSummary, PaginatedCourseSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'
import {
  AcademicCapIcon,
  MagnifyingGlassIcon,
  MapIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { isStaff } from '@/lib/auth/roles'

const LEVELS = [
  { value: '', label: 'Semua' },
  { value: 'pemula', label: 'Pemula' },
  { value: 'menengah', label: 'Menengah' },
  { value: 'mahir', label: 'Mahir' },
] as const

export function LearnPage() {
  const [level, setLevel] = useState('')
  const [search, setSearch] = useState('')
  const me = useMe()
  const app = useQuery({
    queryKey: ['instructor-application'],
    queryFn: getMyInstructorApplication,
    enabled: !!me.data?.user,
  })

  const { data, isLoading, isError, error } = useQuery<PaginatedCourseSummary>({
    queryKey: ['courses', level],
    queryFn: () => getCourses(level ? { level } : {}),
  })

  const showInstructorCta =
    me.data?.user &&
    !me.data.user.is_instructor &&
    !isStaff(me.data.user) &&
    !app.data

  const isInstructor = me.data?.user?.is_instructor || isStaff(me.data?.user)

  const filteredItems = useMemo(() => {
    const items = data?.items ?? []
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category?.name.toLowerCase().includes(q) ||
        c.subcategory?.name.toLowerCase().includes(q) ||
        c.author?.username.toLowerCase().includes(q),
    )
  }, [data?.items, search])

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <LearnSidebar
          className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72"
          totalCourses={data?.total}
        />

        <div className="order-1 min-w-0 flex-1 space-y-6 lg:order-2">
          {/* Hero — pastel PSD, bukan hijau */}
          <div className={heroGradient.learn}>
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="relative z-10 max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                  <AcademicCapIcon className="size-3.5" aria-hidden />
                  Ruang belajar PSD
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Belajar
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Kursus sains data berbahasa Indonesia — video, materi interaktif, dan progres terlacak.
                  Belajar dengan ritme Anda, tetap produktif setiap hari.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {isInstructor && (
                  <Button href="/studio" outline>
                    <SparklesIcon className="size-5" data-slot="icon" />
                    Studio Instruktur
                  </Button>
                )}
                <ButtonPrimary href="/paths">
                  <MapIcon className="size-5" data-slot="icon" />
                  Jalur belajar
                </ButtonPrimary>
              </div>
            </div>
            <div
              className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-primary-400/10 blur-3xl dark:bg-primary-600/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 start-1/4 size-48 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-600/10"
              aria-hidden
            />
          </div>

          {/* Pencarian */}
          <div className="relative">
            <MagnifyingGlassIcon
              className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kursus, kategori, atau instruktur…"
              className="!rounded-2xl !py-3 !ps-12 !pe-10 text-base shadow-sm ring-1 ring-primary-100/80 dark:ring-primary-900/40"
              aria-label="Cari kursus"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                aria-label="Hapus pencarian"
              >
                <XMarkIcon className="size-4" />
              </button>
            )}
          </div>

          {showInstructorCta && (
            <div className="overflow-hidden rounded-2xl border border-primary-200/70 bg-gradient-to-r from-primary-50/90 to-sky-50/80 dark:border-neutral-700 dark:from-neutral-900 dark:via-neutral-800/95 dark:to-sky-950/35">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/50">
                    <AcademicCapIcon className="size-5 text-primary-700 dark:text-primary-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary-900 dark:text-primary-100">Jadi instruktur di PSD</p>
                    <p className="mt-0.5 text-sm text-primary-700/90 dark:text-primary-300/90">
                      Bagikan ilmu lewat course video & materi tertulis.
                    </p>
                  </div>
                </div>
                <Button href="/instructor/apply" className="shrink-0 self-start sm:self-center">
                  Daftar instruktur
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="inline-flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800"
              role="tablist"
              aria-label="Filter level"
            >
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  role="tab"
                  aria-selected={level === l.value}
                  onClick={() => setLevel(l.value)}
                  className={clsx(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    level === l.value
                      ? 'bg-white text-primary-700 shadow-sm dark:bg-neutral-700 dark:text-primary-300'
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-neutral-500">
              {search.trim()
                ? `${filteredItems.length} hasil`
                : `${data?.total ?? 0} kursus tersedia`}
            </p>
          </div>

          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!filteredItems.length}
            emptyTitle={search.trim() ? 'Kursus tidak ditemukan' : 'Belum ada kursus'}
            emptyDescription={
              search.trim()
                ? 'Coba kata kunci lain atau hapus filter level.'
                : 'Kursus baru akan segera ditambahkan.'
            }
            skeletonColumns={3}
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((c: CourseSummary) => (
                <CourseCard key={c.slug} course={c} />
              ))}
            </div>
          </QueryState>
        </div>
      </div>
    </FeaturePageShell>
  )
}
