'use client'

import { QueryState } from '@/components/features/QueryState'
import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { LessonQuizPlayer } from '@/components/features/learn/LessonQuizPlayer'
import { LessonVideo } from '@/components/features/learn/LessonVideo'
import { ProtectedContent } from '@/components/features/learn/ProtectedContent'
import { completeLesson, getCourse, getMyLearning } from '@/lib/api/learn'
import { formatFileSize } from '@/lib/utils/format'
import { CourseDetail, LearningProgress } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CourseLearningShell } from './CourseLearningShell'
import { allLessons, focusLessonHref, hasActiveAccess, isLessonDone, lessonTypeLabel } from './learnUtils'

export function LessonPlayerContent({
  slug,
  lessonId,
  focusMode = false,
}: {
  slug: string
  lessonId: string
  focusMode?: boolean
}) {
  const router = useRouter()
  const qc = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['course', slug],
    queryFn: (): Promise<CourseDetail> => getCourse(slug),
  })

  const course: CourseDetail | undefined = data

  const learning = useQuery({
    queryKey: ['my-learning'],
    queryFn: getMyLearning,
    enabled: !!course && hasActiveAccess(course),
  })

  const progress = learning.data?.items.find((i: LearningProgress) => i.course.slug === slug)
  const lessons = course ? allLessons(course) : []
  const lesson = lessons.find((l) => l.id === lessonId)
  const lessonIdx = lessons.findIndex((l) => l.id === lessonId)
  const prevLesson = lessons[lessonIdx - 1]
  const nextLesson = lessons[lessonIdx + 1]
  const lessonType = lesson?.type ?? 'reading'
  const done = lesson ? isLessonDone(lesson.id, lessons, progress) : false

  const complete = useMutation({
    mutationFn: () => completeLesson(slug, lessonId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-learning'] })
      qc.invalidateQueries({ queryKey: ['course', slug] })
      if (nextLesson) router.push(focusLessonHref(slug, nextLesson.id))
    },
  })

  const invalidateProgress = () => {
    qc.invalidateQueries({ queryKey: ['my-learning'] })
    qc.invalidateQueries({ queryKey: ['course', slug] })
  }

  if (course && !hasActiveAccess(course)) {
    const expired = course.access_status === 'expired'
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <h1 className="text-xl font-semibold">{expired ? 'Akses berakhir' : 'Enrol diperlukan'}</h1>
        <p className="mt-2 max-w-sm text-neutral-500">
          {expired
            ? 'Perpanjang enrol untuk melanjutkan belajar di mode fokus.'
            : 'Enrol course untuk mengakses mode fokus belajar.'}
        </p>
        <ButtonPrimary href={`/learn/${slug}`} className="mt-6">
          {expired ? 'Perpanjang di ikhtisar' : 'Lihat ikhtisar course'}
        </ButtonPrimary>
      </div>
    )
  }

  if (course && lesson?.locked) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-neutral-500">Materi lesson terkunci.</p>
        <ButtonPrimary href={`/learn/${slug}`} className="mt-4">
          Kembali ke ikhtisar
        </ButtonPrimary>
      </div>
    )
  }

  const shell = (content: React.ReactNode) =>
    focusMode ? (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 py-2 dark:border-neutral-700 dark:bg-neutral-900">
          <p className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Mode fokus · {course?.title}
          </p>
          <Link
            href={`/learn/${slug}`}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <XMarkIcon className="size-4" />
            Keluar
          </Link>
        </div>
        <CourseLearningShell
          course={course!}
          slug={slug}
          progress={progress}
          activeLessonId={lessonId}
          focusMode
        >
          {content}
        </CourseLearningShell>
      </div>
    ) : (
      <div className="container py-6 lg:py-8">
        <CourseLearningShell course={course!} slug={slug} progress={progress} activeLessonId={lessonId}>
          {content}
        </CourseLearningShell>
      </div>
    )

  return (
    <QueryState isLoading={isLoading} isError={isError} error={error}>
      {course && lesson && shell(
        <div className="flex min-h-full flex-col">
          {lessonType === 'video' && (
            <div className="bg-neutral-950 p-4 lg:p-6">
              <LessonVideo url={lesson.video_url ?? ''} title={lesson.title} />
            </div>
          )}

          <ProtectedContent className="flex-1 p-6 lg:p-8">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
              <span>{lessonTypeLabel[lessonType]}</span>
              <span>·</span>
              <span>
                Pelajaran {lessonIdx + 1} dari {lessons.length}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 lg:text-3xl">
              {lesson.title}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">{lesson.duration_min ?? 0} menit</p>

            {lessonType === 'reading' && lesson.content_md && (
              <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
                <SimpleMarkdown content={lesson.content_md} className="text-base leading-relaxed" />
              </div>
            )}

            {lessonType === 'quiz' && (
              <LessonQuizPlayer slug={slug} lesson={lesson} onPassed={invalidateProgress} />
            )}

            {(lesson.materials ?? []).length > 0 && (
              <section className="mt-8 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                <h2 className="text-sm font-semibold">Materi unduhan</h2>
                <ul className="mt-3 space-y-2">
                  {(lesson.materials ?? []).map((mat) => (
                    <li key={mat.url}>
                      <a
                        href={mat.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-2.5 text-sm transition hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-800"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <ArrowDownTrayIcon className="size-4 shrink-0 text-primary-600" />
                          <span className="truncate font-medium">{mat.name}</span>
                        </span>
                        <span className="shrink-0 text-xs text-neutral-500">{formatFileSize(mat.size_bytes)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {lessonType !== 'quiz' && (
              <div className="mt-10 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
                {done ? (
                  <span className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckIcon className="size-5" />
                    Pelajaran selesai
                  </span>
                ) : (
                  <ButtonPrimary onClick={() => complete.mutate()} disabled={complete.isPending}>
                    {complete.isPending ? 'Menyimpan…' : 'Tandai selesai & lanjut'}
                  </ButtonPrimary>
                )}
                {nextLesson && (
                  <Button href={focusLessonHref(slug, nextLesson.id)} outline>
                    Lewati ke berikutnya
                  </Button>
                )}
              </div>
            )}
          </ProtectedContent>

          <footer className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-neutral-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95 lg:px-8">
            {prevLesson ? (
              <Link
                href={focusLessonHref(slug, prevLesson.id)}
                className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400"
              >
                <ArrowLeftIcon className="size-4" />
                <span className="hidden sm:inline">{prevLesson.title}</span>
                <span className="sm:hidden">Sebelumnya</span>
              </Link>
            ) : (
              <Link href={`/learn/${slug}`} className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-primary-600 dark:text-neutral-400">
                <ArrowLeftIcon className="size-4" />
                Ikhtisar
              </Link>
            )}
            {nextLesson ? (
              <Link
                href={focusLessonHref(slug, nextLesson.id)}
                className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <span className="hidden sm:inline">{nextLesson.title}</span>
                <span className="sm:hidden">Berikutnya</span>
                <ArrowRightIcon className="size-4" />
              </Link>
            ) : (
              <Link href={`/learn/${slug}`} className="text-sm font-medium text-primary-600 dark:text-primary-400">
                Selesai — kembali ke ikhtisar
              </Link>
            )}
          </footer>
        </div>
      )}
      {course && !lesson && (
        <div className="flex h-full items-center justify-center p-8 text-center">
          <div>
            <p className="text-neutral-500">Pelajaran tidak ditemukan.</p>
            <ButtonPrimary href={`/learn/${slug}`} className="mt-4">
              Kembali ke ikhtisar
            </ButtonPrimary>
          </div>
        </div>
      )}
    </QueryState>
  )
}
