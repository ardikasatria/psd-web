'use client'

import { CourseDetail, LearningProgress } from '@/types/api'
import { CourseSidebar } from './CourseSidebar'
import clsx from 'clsx'

type Props = {
  course: CourseDetail
  slug: string
  progress?: LearningProgress
  activeLessonId?: string | null
  locked?: boolean
  focusMode?: boolean
  children: React.ReactNode
}

export function CourseLearningShell({
  course,
  slug,
  progress,
  activeLessonId,
  locked,
  focusMode = false,
  children,
}: Props) {
  if (focusMode) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col lg:flex-row">
        <div className="w-full shrink-0 border-b border-neutral-200 lg:w-72 lg:border-b-0 lg:border-e xl:w-80 dark:border-neutral-700">
          <div className="max-h-[38vh] overflow-y-auto lg:h-full lg:max-h-none">
            <CourseSidebar
              course={course}
              slug={slug}
              progress={progress}
              activeLessonId={activeLessonId}
              locked={locked}
              focusMode
            />
          </div>
        </div>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white dark:bg-neutral-900">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div
      className={clsx(
        '-mx-[var(--container-px,1rem)] flex min-h-[calc(100dvh-4.5rem)] flex-col lg:mx-0 lg:min-h-[calc(100dvh-5rem)] lg:flex-row lg:rounded-2xl lg:border lg:border-neutral-200 lg:shadow-sm dark:lg:border-neutral-700'
      )}
    >
      <div className="w-full shrink-0 lg:w-80 xl:w-96">
        <div className="sticky top-16 max-h-[calc(100dvh-4.5rem)] lg:static lg:max-h-none lg:h-full">
          <CourseSidebar
            course={course}
            slug={slug}
            progress={progress}
            activeLessonId={activeLessonId}
            locked={locked}
          />
        </div>
      </div>
      <main className="min-w-0 flex-1 overflow-y-auto bg-white dark:bg-neutral-900">
        {children}
      </main>
    </div>
  )
}
