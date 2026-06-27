import { Badge } from '@/shared/Badge'
import { CourseSummary } from '@/types/api'
import Link from 'next/link'

const levelLabel: Record<CourseSummary['level'], string> = {
  pemula: 'Pemula',
  menengah: 'Menengah',
  mahir: 'Mahir',
}

export function CourseRow({ course: c }: { course: CourseSummary }) {
  return (
    <Link
      href={`/learn/${c.slug}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/50"
    >
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-medium text-neutral-900 dark:text-neutral-100">{c.title}</h4>
        <p className="mt-1 text-xs text-neutral-500">{c.lessons_count} pelajaran</p>
      </div>
      <Badge color="zinc">{levelLabel[c.level]}</Badge>
    </Link>
  )
}
