import { Badge } from '@/shared/Badge'
import { LearningProgress } from '@/types/api'
import Link from 'next/link'
import { formatAccessExpiry } from '@/components/features/learn/learnUtils'

const levelLabel: Record<LearningProgress['course']['level'], string> = {
  pemula: 'Pemula',
  menengah: 'Menengah',
  mahir: 'Mahir',
}

export function LearningProgressRow({ item }: { item: LearningProgress }) {
  const { course, completed, total, percent, next_lesson_id, expired, expires_at } = item
  const href = expired
    ? `/learn/${course.slug}`
    : next_lesson_id
      ? `/learn/${course.slug}/${next_lesson_id}`
      : `/learn/${course.slug}`

  return (
    <Link
      href={href}
      className={`block rounded-xl border p-4 transition-colors ${
        expired
          ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:bg-amber-950/30'
          : 'border-neutral-100 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-medium text-neutral-900 dark:text-neutral-100">{course.title}</h4>
          <p className="mt-1 text-xs text-neutral-500">
            {completed}/{total} pelajaran selesai
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge color="zinc">{levelLabel[course.level]}</Badge>
          {expired ? (
            <Badge color="red" className="text-[10px]">Kedaluwarsa</Badge>
          ) : expires_at ? (
            <Badge color="yellow" className="text-[10px]">s/d {formatAccessExpiry(expires_at)}</Badge>
          ) : (
            <Badge color="green" className="text-[10px]">Selamanya</Badge>
          )}
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
        <div
          className={`h-full rounded-full transition-all ${expired ? 'bg-amber-400' : 'bg-emerald-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {expired ? (
        <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">Perpanjang akses →</p>
      ) : next_lesson_id ? (
        <p className="mt-2 text-xs font-medium text-primary-600 dark:text-primary-400">Lanjutkan →</p>
      ) : null}
    </Link>
  )
}
