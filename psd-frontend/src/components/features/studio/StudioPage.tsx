'use client'

import { FeaturePageShell } from '@/components/features/layout'
import { QueryState } from '@/components/features/QueryState'
import {
  canSubmitCourseReview,
  courseStatusColor,
  courseStatusLabel,
} from '@/components/features/learn/courseStatus'
import { StudioSidebar, studioStatusSummary } from '@/components/features/studio/StudioSidebar'
import { useMe } from '@/lib/api/dashboard'
import { createCourse, getAuthoredCourses, submitCourseReview } from '@/lib/api/learn'
import { isStaff } from '@/lib/auth/roles'
import { CourseSummary, CourseStatus } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import { ConfirmDialog } from '@/components/admin/AdminShared'
import {
  AcademicCapIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

const STATUS_FILTERS: { id: CourseStatus | ''; label: string }[] = [
  { id: '', label: 'Semua' },
  { id: 'draft', label: 'Draft' },
  { id: 'pending_review', label: 'Tinjauan' },
  { id: 'published', label: 'Terbit' },
  { id: 'rejected', label: 'Ditolak' },
]

const levelLabel: Record<CourseSummary['level'], string> = {
  pemula: 'Pemula',
  menengah: 'Menengah',
  mahir: 'Mahir',
}

function StudioCourseCard({
  course,
  onSubmitReview,
}: {
  course: CourseSummary
  onSubmitReview: (slug: string) => void
}) {
  const status = course.status ?? 'draft'

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white transition hover:-translate-y-0.5 hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
      <div className="relative bg-gradient-to-br from-primary-200/90 via-primary-300/75 to-sky-400/65 px-5 py-5 dark:from-primary-900/55 dark:via-primary-800/45 dark:to-indigo-900/40">
        <div className="pointer-events-none absolute -end-4 -top-4 size-20 rounded-full bg-white/20 blur-xl dark:bg-white/5" />
        <div className="relative flex items-start justify-between gap-2">
          <SparklesIcon className="size-7 text-white dark:text-primary-100" aria-hidden />
          <Badge color={courseStatusColor[status]}>{courseStatusLabel[status]}</Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold leading-snug text-neutral-900 group-hover:text-primary-700 dark:text-neutral-100 dark:group-hover:text-primary-300">
          {course.title}
        </h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <BookOpenIcon className="size-4" aria-hidden />
            {course.lessons_count} pelajaran
          </span>
          <span>{levelLabel[course.level]}</span>
        </p>
        {status === 'rejected' && course.review_note && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
            <span className="font-medium">Catatan humas:</span> {course.review_note}
          </p>
        )}
        {status === 'published' && (
          <p className="mt-3 rounded-xl bg-primary-50 px-3 py-2 text-xs text-primary-800 dark:bg-primary-950/40 dark:text-primary-200">
            Course aktif di katalog — pembelajar dapat mendaftar.
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <ButtonPrimary href={`/studio/${course.slug}/edit`} className="!px-4 !py-2 text-sm">
            {status === 'pending_review' ? 'Lihat builder' : 'Buka builder'}
          </ButtonPrimary>
          {canSubmitCourseReview(status) && (
            <ConfirmDialog
              label="Ajukan tinjauan"
              confirm={`Ajukan course "${course.title}" untuk ditinjau tim PSD?`}
              onConfirm={() => onSubmitReview(course.slug)}
            />
          )}
          <Link
            href={`/learn/${course.slug}`}
            className="self-center text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            Pratinjau
          </Link>
          <Link
            href={`/studio/courses/${course.slug}/learners`}
            className="inline-flex items-center gap-1 self-center text-sm text-neutral-500 hover:underline"
          >
            <UserGroupIcon className="size-3.5" aria-hidden />
            Pembelajar
          </Link>
        </div>
      </div>
    </article>
  )
}

function StudioGatePage() {
  return (
    <FeaturePageShell>
      <div className="mx-auto max-w-2xl py-8">
        <div className="relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-sky-50/70 to-indigo-50/60 p-8 dark:border-primary-900/40 dark:from-primary-950/30 dark:via-neutral-900 dark:to-indigo-950/25 sm:p-10">
          <div className="relative z-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
              <AcademicCapIcon className="size-3.5" aria-hidden />
              Studio Instruktur
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              Bagikan keahlian Anda
            </h1>
            <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              Studio adalah ruang kreasi course — dari draft hingga terbit di katalog Belajar PSD.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
              {[
                'Builder modul & pelajaran dengan video, teks, dan quiz',
                'Alur tinjauan humas sebelum course go-live',
                'Pantau pembelajar dan progres setelah terbit',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary-500" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <ButtonPrimary href="/instructor/apply" className="mt-8">
              Daftar sebagai instruktur
            </ButtonPrimary>
          </div>
          <div
            className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-primary-400/10 blur-3xl dark:bg-primary-600/10"
            aria-hidden
          />
        </div>
      </div>
    </FeaturePageShell>
  )
}

export function StudioPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const me = useMe()
  const canAccess = me.data?.user?.is_instructor || isStaff(me.data?.user)

  const list = useQuery<CourseSummary[]>({
    queryKey: ['authored-courses'],
    queryFn: getAuthoredCourses,
    enabled: canAccess,
  })

  const [open, setOpen] = useState(false)
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CourseStatus | ''>('')

  const courses = list.data ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return courses.filter((c) => {
      if (statusFilter && (c.status ?? 'draft') !== statusFilter) return false
      if (!q) return true
      return c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
    })
  }, [courses, search, statusFilter])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['authored-courses'] })
    qc.invalidateQueries({ queryKey: ['courses'] })
  }

  const create = useMutation({
    mutationFn: () =>
      createCourse({
        slug,
        title,
        level: 'pemula',
        description: '',
        modules: [],
      }),
    onSuccess: (res) => {
      invalidate()
      setOpen(false)
      router.push(`/studio/${res.slug}/edit`)
    },
  })

  const submitReview = useMutation({
    mutationFn: (courseSlug: string) => submitCourseReview(courseSlug),
    onSuccess: invalidate,
  })

  if (me.isLoading) {
    return (
      <FeaturePageShell>
        <div className="py-16 text-center text-neutral-500">Memuat…</div>
      </FeaturePageShell>
    )
  }

  if (!canAccess) return <StudioGatePage />

  const userName = me.data?.user?.name?.split(' ')[0] ?? 'Instruktur'

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <StudioSidebar
          className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72"
          courses={courses}
        />

        <div className="order-1 min-w-0 flex-1 space-y-6 lg:order-2">
          <div className="relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-sky-50/70 to-indigo-50/60 p-8 dark:border-primary-900/40 dark:from-primary-950/30 dark:via-neutral-900 dark:to-indigo-950/25 sm:p-10">
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="relative z-10 max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                  <SparklesIcon className="size-3.5" aria-hidden />
                  Studio Instruktur
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Halo, {userName}!
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Bangun course, kembangkan materi, dan bantu komunitas PSD belajar lebih cepat.
                  {courses.length > 0 && (
                    <span className="mt-1 block text-sm text-primary-700/90 dark:text-primary-300/90">
                      {studioStatusSummary(courses)}
                    </span>
                  )}
                </p>
              </div>
              <ButtonPrimary
                type="button"
                onClick={() => {
                  setSlug('')
                  setTitle('')
                  setOpen(true)
                }}
                className="shrink-0"
              >
                <PlusIcon className="size-4" aria-hidden />
                Course baru
              </ButtonPrimary>
            </div>
            <div
              className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-primary-400/10 blur-3xl dark:bg-primary-600/10"
              aria-hidden
            />
          </div>

          <div className="relative">
            <MagnifyingGlassIcon
              className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari course Anda…"
              className="!rounded-2xl !py-3 !ps-12 !pe-10 text-base shadow-sm ring-1 ring-primary-100/80 dark:ring-primary-900/40"
              aria-label="Cari course"
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="inline-flex flex-wrap rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800"
              role="tablist"
              aria-label="Filter status course"
            >
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={clsx(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    statusFilter === f.id
                      ? 'bg-white text-primary-700 shadow-sm dark:bg-neutral-700 dark:text-primary-300'
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-neutral-500">
              {search.trim() || statusFilter
                ? `${filtered.length} course`
                : `${courses.length} course`}
            </p>
          </div>

          <QueryState
            isLoading={list.isLoading}
            isError={list.isError}
            error={list.error}
            isEmpty={!list.isLoading && !list.isError && courses.length > 0 && filtered.length === 0}
            emptyTitle="Tidak ada course cocok"
            emptyDescription="Coba ubah filter atau kata kunci pencarian."
            skeletonColumns={3}
          >
            {courses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-primary-300/70 bg-primary-50/30 p-10 text-center dark:border-primary-800 dark:bg-primary-950/20">
                <AcademicCapIcon className="mx-auto size-12 text-primary-400 dark:text-primary-500" aria-hidden />
                <p className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Course pertama menanti
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
                  Ide sederhana + satu modul pendek sudah cukup untuk memulai. PSD siap membantu menerbitkan ke
                  komunitas.
                </p>
                <ButtonPrimary
                  type="button"
                  className="mt-6"
                  onClick={() => {
                    setSlug('')
                    setTitle('')
                    setOpen(true)
                  }}
                >
                  <PlusIcon className="size-4" aria-hidden />
                  Buat course pertama
                </ButtonPrimary>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((c) => (
                  <StudioCourseCard
                    key={c.slug}
                    course={c}
                    onSubmitReview={(s) => submitReview.mutate(s)}
                  />
                ))}
              </div>
            )}
          </QueryState>
        </div>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <DialogTitle>Course baru</DialogTitle>
          <DialogBody className="space-y-4">
            <Input
              placeholder="Slug (contoh: python-dasar)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="!rounded-xl"
            />
            <Input
              placeholder="Judul course"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="!rounded-xl"
            />
            <p className="text-sm text-neutral-500">
              Setelah dibuat, Anda akan diarahkan ke course builder untuk menambah topik, lesson, dan materi.
            </p>
          </DialogBody>
          <DialogActions>
            <Button outline type="button" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <ButtonPrimary type="submit" disabled={create.isPending}>
              Buat & buka builder
            </ButtonPrimary>
          </DialogActions>
        </form>
      </Dialog>
    </FeaturePageShell>
  )
}
