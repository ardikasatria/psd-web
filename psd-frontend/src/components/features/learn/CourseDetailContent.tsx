'use client'

import { CircleJourneyCTA } from '@/components/features/quests/CircleJourneyCTA'
import { useTrackView } from '@/lib/analytics/useTrackView'
import { QueryState } from '@/components/features/QueryState'
import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { CourseStatsStrip } from '@/components/features/learn/CourseStatsStrip'
import { enrollCourse, getCourse, getMyLearning } from '@/lib/api/learn'
import { CourseDetail, LearningProgress } from '@/types/api'
import Avatar from '@/shared/Avatar'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  BookOpenIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  PlayIcon,
  PuzzlePieceIcon,
  UserIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import clsx from 'clsx'
import {
  allLessons,
  focusLessonHref,
  formatAccessLabel,
  formatAccessExpiry,
  formatDuration,
  getLearningPosition,
  hasActiveAccess,
  isLessonDone,
  levelColor,
  levelLabel,
  lessonTypeLabel,
  totalDurationMin,
} from './learnUtils'

export function CourseDetailContent({ slug }: { slug: string }) {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['course', slug],
    queryFn: (): Promise<CourseDetail> => getCourse(slug),
  })

  const learning = useQuery({
    queryKey: ['my-learning'],
    queryFn: getMyLearning,
    enabled: !!data?.enrolled,
  })

  const enroll = useMutation({
    mutationFn: () => enrollCourse(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', slug] })
      qc.invalidateQueries({ queryKey: ['my-learning'] })
    },
  })

  const progress = learning.data?.items.find((i: LearningProgress) => i.course.slug === slug)
  const course: CourseDetail | undefined = data
  const lessons = course ? allLessons(course) : []
  const totalMinutes = course ? totalDurationMin(course) : 0
  const position = course && hasActiveAccess(course) ? getLearningPosition(course, progress) : null
  const activeAccess = course ? hasActiveAccess(course) : false
  const accessLabel = course ? formatAccessLabel(course) : ''

  useTrackView(!!course, 'course', course?.slug, {
    category_slug: course?.category?.slug,
  })

  const lessonIcon = (type?: string) => {
    if (type === 'video') return VideoCameraIcon
    if (type === 'quiz') return PuzzlePieceIcon
    return DocumentTextIcon
  }

  const focusHref =
    activeAccess && position?.lesson.id
      ? focusLessonHref(slug, position.lesson.id)
      : activeAccess && lessons[0]
        ? focusLessonHref(slug, lessons[0].id)
        : null

  return (
    <div className="container py-6 lg:py-10">
      <QueryState isLoading={isLoading} isError={isError} error={error}>
        {course && (
          <div className="mx-auto max-w-4xl">
            {/* Hero */}
            <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 px-6 py-10 text-white sm:px-10">
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
                <div className="absolute -end-8 -top-8 size-48 rounded-full bg-white/10 blur-3xl" />
              </div>
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={levelColor[course.level]} className="!bg-white/20 !text-white ring-0">
                    {levelLabel[course.level]}
                  </Badge>
                  <Badge className="!bg-white/15 !text-white/90 ring-0">{accessLabel}</Badge>
                </div>
                <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{course.title}</h1>
                {course.author && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-white/85">
                    <UserIcon className="size-4" />
                    Instruktur{' '}
                    <Link href={`/${course.author.username}`} className="font-medium underline decoration-white/40 underline-offset-2 hover:decoration-white">
                      {course.author.username}
                    </Link>
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-4 text-sm text-white/80">
                  <span className="flex items-center gap-1.5">
                    <BookOpenIcon className="size-4" />
                    {lessons.length} pelajaran
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ClockIcon className="size-4" />
                    {formatDuration(totalMinutes)}
                  </span>
                  <span>{course.modules.length} topik</span>
                </div>
              </div>
            </div>

            {/* Statistik social proof */}
            {course.status === 'published' && (
              <CourseStatsStrip course={course} className="mt-6" />
            )}

            {/* Akses kedaluwarsa */}
            {course.access_status === 'expired' && (
              <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="flex gap-3">
                  <ExclamationTriangleIcon className="size-6 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-100">Akses Anda berakhir</p>
                    <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/90">
                      Perpanjang enrol untuk melanjutkan belajar dan mengakses materi lesson.
                    </p>
                  </div>
                </div>
                <ButtonPrimary onClick={() => enroll.mutate()} disabled={enroll.isPending} className="shrink-0">
                  {enroll.isPending ? 'Memperpanjang…' : 'Perpanjang akses'}
                </ButtonPrimary>
              </section>
            )}

            {/* Progress card (akses aktif) */}
            {activeAccess && progress && (
              <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Progres belajar Anda</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-2 w-36 overflow-hidden rounded-full bg-emerald-200/80 dark:bg-emerald-900/50">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress.percent}%` }} />
                      </div>
                      <span className="text-sm text-emerald-700 dark:text-emerald-300">
                        {progress.completed}/{progress.total} selesai ({progress.percent}%)
                      </span>
                    </div>
                    {position && (
                      <p className="mt-2 text-sm text-emerald-800/90 dark:text-emerald-200/90">
                        Topik: <strong>{position.moduleTitle}</strong>
                        {progress.next_lesson_id && (
                          <> · Lanjut: <strong>{position.lesson.title}</strong></>
                        )}
                      </p>
                    )}
                    {progress.expires_at && (
                      <p className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                        Akses sampai {formatAccessExpiry(progress.expires_at)}
                      </p>
                    )}
                  </div>
                  {focusHref && (
                    <ButtonPrimary href={focusHref} className="!gap-2 shrink-0">
                      <PlayIcon className="size-5" />
                      {progress.next_lesson_id ? 'Lanjutkan belajar' : progress.completed >= progress.total && progress.total > 0 ? 'Ulangi course' : 'Mulai belajar'}
                    </ButtonPrimary>
                  )}
                </div>
              </section>
            )}

            {activeAccess && progress && progress.completed >= progress.total && progress.total > 0 && !progress.next_lesson_id && (
              <CircleJourneyCTA variant="course-complete" className="mt-6" />
            )}

            {/* Enrol CTA */}
            {course.status === 'published' && course.access_status === 'none' && (
              <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">Siap mulai belajar?</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {accessLabel} · Lihat kurikulum terkunci di bawah, lalu enrol untuk membuka materi.
                    </p>
                  </div>
                  <ButtonPrimary onClick={() => enroll.mutate()} disabled={enroll.isPending} className="!gap-2 shrink-0">
                    {enroll.isPending ? 'Mendaftar…' : 'Enrol sekarang'}
                  </ButtonPrimary>
                </div>
              </div>
            )}

            {course.status !== 'published' && (
              <p className="mt-8 text-sm text-neutral-500">
                Course ini belum diterbitkan. Enrol tersedia setelah publikasi resmi PSD.
              </p>
            )}

            {/* Kolaborasi */}
            {(course.author || course.publisher) && (
              <section className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Kolaborasi</h2>
                <div className="mt-4 flex flex-wrap items-center gap-6">
                  {course.author && (
                    <div className="flex items-center gap-3">
                      <Avatar src={course.author.avatar_url ?? undefined} alt={course.author.username} className="size-11" width={44} height={44} sizes="44px" />
                      <div>
                        <p className="text-xs text-neutral-500">Dibuat oleh</p>
                        <Link href={`/${course.author.username}`} className="font-medium text-neutral-900 hover:underline dark:text-neutral-100">
                          {course.author.username}
                        </Link>
                      </div>
                    </div>
                  )}
                  {course.publisher && (
                    <div className="flex items-center gap-3">
                      <Avatar src={course.publisher.avatar_url ?? undefined} alt={course.publisher.username} className="size-11" width={44} height={44} sizes="44px" />
                      <div>
                        <p className="text-xs text-neutral-500">Diterbitkan oleh</p>
                        <Link href={`/${course.publisher.username}`} className="font-medium text-neutral-900 hover:underline dark:text-neutral-100">
                          {course.publisher.username}
                        </Link>
                        <Badge color="blue" className="mt-1">Resmi PSD</Badge>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="mt-10">
              <h2 className="text-lg font-semibold">Tentang course ini</h2>
              <p className="mt-3 leading-relaxed text-neutral-600 dark:text-neutral-400">{course.description}</p>
            </section>

            {course.requirements_md && (
              <section className="mt-8">
                <h2 className="text-lg font-semibold">Syarat</h2>
                <div className="prose prose-neutral mt-3 max-w-none dark:prose-invert">
                  <SimpleMarkdown content={course.requirements_md} />
                </div>
              </section>
            )}

            {/* Kurikulum */}
            <section className="mt-10">
              <h2 className="text-lg font-semibold">Kurikulum</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {course.modules.length} topik · {lessons.length} lesson
                {activeAccess ? ' · Klik lesson untuk masuk mode fokus' : ' · Pratinjau struktur (materi terkunci)'}
              </p>
              <div className="mt-4 space-y-4">
                {course.modules.map((mod, mi) => {
                  const modDone = mod.lessons.filter((l) => isLessonDone(l.id, lessons, progress)).length
                  return (
                    <div key={mi} className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/40">
                        <p className="text-sm font-semibold">{mod.title}</p>
                        {activeAccess && progress && (
                          <span className="text-xs text-neutral-500">
                            {modDone}/{mod.lessons.length}
                          </span>
                        )}
                      </div>
                      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {mod.lessons.map((l) => {
                          const Icon = lessonIcon(l.type)
                          const locked = l.locked ?? !activeAccess
                          const done = activeAccess && isLessonDone(l.id, lessons, progress)
                          const isNext = activeAccess && progress?.next_lesson_id === l.id
                          const row = (
                            <>
                              {locked ? (
                                <LockClosedIcon className="size-5 shrink-0 text-neutral-300" />
                              ) : done ? (
                                <CheckCircleSolid className="size-5 shrink-0 text-emerald-500" />
                              ) : isNext ? (
                                <PlayIcon className="size-5 shrink-0 text-primary-600" />
                              ) : (
                                <Icon className="size-5 shrink-0 text-neutral-400" />
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{l.title}</span>
                                <span className="text-xs text-neutral-500">
                                  {lessonTypeLabel[l.type ?? 'reading']} · {l.duration_min ?? 0} menit
                                  {locked && ' · Terkunci'}
                                </span>
                              </span>
                              {isNext && (
                                <Badge color="blue" className="shrink-0 text-[10px]">Lanjut di sini</Badge>
                              )}
                              {done && <span className="text-xs text-emerald-600">Selesai</span>}
                            </>
                          )
                          return (
                            <li key={l.id}>
                              {!locked ? (
                                <Link
                                  href={focusLessonHref(slug, l.id)}
                                  className={clsx(
                                    'flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
                                    isNext && 'bg-primary-50/50 dark:bg-primary-950/20'
                                  )}
                                >
                                  {row}
                                </Link>
                              ) : (
                                <div className="flex items-center gap-3 px-4 py-3 text-sm text-neutral-500">{row}</div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </section>

            {activeAccess && focusHref && (
              <div className="mt-10 flex justify-center pb-4">
                <ButtonPrimary href={focusHref} className="!gap-2">
                  <PlayIcon className="size-5" />
                  Masuk mode fokus belajar
                </ButtonPrimary>
              </div>
            )}
          </div>
        )}
      </QueryState>
    </div>
  )
}
