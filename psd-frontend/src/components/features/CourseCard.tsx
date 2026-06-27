import { CategoryBadge } from '@/components/common/CategoryBadge'
import { Badge } from '@/shared/Badge'
import { CourseSummary } from '@/types/api'
import { AcademicCapIcon, BookOpenIcon, UserIcon } from '@heroicons/react/24/outline'
import { trackCourseClick } from '@/lib/analytics/entities'
import Link from 'next/link'

const levelLabel: Record<CourseSummary['level'], string> = {
  pemula: 'Pemula',
  menengah: 'Menengah',
  mahir: 'Mahir',
}

const levelColor: Record<CourseSummary['level'], 'green' | 'yellow' | 'red'> = {
  pemula: 'green',
  menengah: 'yellow',
  mahir: 'red',
}

export function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <Link
      href={`/learn/${course.slug}`}
      onClick={() => trackCourseClick(course)}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
    >
      <div className="relative bg-gradient-to-br from-primary-200/90 via-primary-300/80 to-sky-400/70 px-5 py-6 dark:from-primary-900/60 dark:via-primary-800/50 dark:to-indigo-900/40">
        <div className="pointer-events-none absolute -end-6 -top-6 size-24 rounded-full bg-white/20 blur-2xl dark:bg-white/5" />
        <div className="pointer-events-none absolute -bottom-4 start-4 size-16 rounded-full bg-sky-200/30 blur-xl dark:bg-sky-500/10" />
        <AcademicCapIcon className="relative size-8 text-white dark:text-primary-100" aria-hidden />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <Badge color={levelColor[course.level]}>{levelLabel[course.level]}</Badge>
        <h3 className="mt-3 text-lg font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
          {course.title}
        </h3>
        <CategoryBadge category={course.category} subcategory={course.subcategory} className="mt-2" />
        <p className="mt-auto flex flex-col gap-1 pt-4 text-sm text-neutral-500">
          <span className="flex items-center gap-1.5">
            <BookOpenIcon className="size-4" aria-hidden />
            {course.lessons_count} pelajaran
          </span>
          {course.author && (
            <span className="flex items-center gap-1.5">
              <UserIcon className="size-4" aria-hidden />
              {course.author.username}
            </span>
          )}
        </p>
      </div>
    </Link>
  )
}
