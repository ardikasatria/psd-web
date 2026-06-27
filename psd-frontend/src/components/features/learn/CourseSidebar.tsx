'use client'

import { CourseDetail, LearningProgress } from '@/types/api'
import { Badge } from '@/shared/Badge'
import {
  AcademicCapIcon,
  DocumentTextIcon,
  LockClosedIcon,
  PlayCircleIcon,
  PuzzlePieceIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'
import clsx from 'clsx'
import { allLessons, focusLessonHref, isLessonDone, levelLabel } from './learnUtils'

const TYPE_ICON = {
  reading: DocumentTextIcon,
  video: VideoCameraIcon,
  quiz: PuzzlePieceIcon,
} as const

type Props = {
  course: CourseDetail
  slug: string
  progress?: LearningProgress
  activeLessonId?: string | null
  locked?: boolean
  focusMode?: boolean
}

export function CourseSidebar({
  course,
  slug,
  progress,
  activeLessonId,
  locked = false,
  focusMode = false,
}: Props) {
  const lessons = allLessons(course)
  const percent = progress?.percent ?? 0

  return (
    <aside className="flex h-full flex-col border-e border-neutral-200 bg-neutral-50/80 dark:border-neutral-700 dark:bg-neutral-900/50">
      {/* Course header */}
      <div className="shrink-0 border-b border-neutral-200 p-4 dark:border-neutral-700">
        {focusMode ? (
          <Link
            href={`/learn/${slug}`}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            ← Keluar mode fokus
          </Link>
        ) : (
          <Link
            href="/learn"
            className="text-xs font-medium text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400"
          >
            ← Katalog belajar
          </Link>
        )}
        <div className="mt-2 flex items-start gap-2">
          <AcademicCapIcon className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
              {course.title}
            </h2>
            <Badge color="zinc" className="mt-1.5">
              {levelLabel[course.level]}
            </Badge>
          </div>
        </div>

        {!locked && progress && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Progres</span>
              <span>
                {progress.completed}/{progress.total} · {percent}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Curriculum */}
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Kurikulum course">
        {course.modules.map((mod, mi) => (
          <div key={mi} className="mb-4 last:mb-0">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              {mod.title}
            </p>
            <ul className="mt-0.5 space-y-0.5">
              {mod.lessons.map((l) => {
                const lessonLocked = locked || l.locked
                const done = !lessonLocked && isLessonDone(l.id, lessons, progress)
                const active = activeLessonId === l.id
                const TypeIcon = TYPE_ICON[l.type ?? 'reading']

                const inner = (
                  <>
                    {lessonLocked ? (
                      <LockClosedIcon className="size-4 shrink-0 text-neutral-300" />
                    ) : done ? (
                      <CheckCircleSolid className="size-4 shrink-0 text-emerald-500" />
                    ) : active ? (
                      <PlayCircleIcon className="size-4 shrink-0 text-primary-600 dark:text-primary-400" />
                    ) : (
                      <TypeIcon className="size-4 shrink-0 text-neutral-400" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{l.title}</span>
                    <span className="shrink-0 text-[10px] tabular-nums text-neutral-400">
                      {l.duration_min ?? 0}m
                    </span>
                  </>
                )

                const className = clsx(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                  lessonLocked && 'cursor-default text-neutral-400',
                  !lessonLocked && active && 'bg-primary-100/80 font-medium text-primary-800 dark:bg-primary-950/50 dark:text-primary-200',
                  !lessonLocked && !active && 'text-neutral-600 hover:bg-white hover:shadow-sm dark:text-neutral-400 dark:hover:bg-neutral-800',
                )

                return (
                  <li key={l.id}>
                    {lessonLocked ? (
                      <div className={className}>{inner}</div>
                    ) : (
                      <Link href={focusLessonHref(slug, l.id)} className={className}>
                        {inner}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!locked && focusMode && (
        <div className="shrink-0 border-t border-neutral-200 p-3 dark:border-neutral-700">
          <Link
            href={`/learn/${slug}`}
            className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-neutral-600 ring-1 ring-neutral-200 hover:bg-white dark:text-neutral-300 dark:ring-neutral-600 dark:hover:bg-neutral-800"
          >
            Ikhtisar & progres
          </Link>
        </div>
      )}

      {!locked && !activeLessonId && !focusMode && (
        <div className="shrink-0 border-t border-neutral-200 p-3 dark:border-neutral-700">
          <Link
            href={`/learn/${slug}`}
            className={clsx(
              'block rounded-lg px-3 py-2 text-sm font-medium',
              'bg-white text-neutral-700 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-600',
            )}
          >
            Ikhtisar course
          </Link>
        </div>
      )}
    </aside>
  )
}
