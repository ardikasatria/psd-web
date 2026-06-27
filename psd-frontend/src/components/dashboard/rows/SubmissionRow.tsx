import { Badge } from '@/shared/Badge'
import { MySubmission } from '@/types/api'
import Link from 'next/link'

const statusLabel: Record<MySubmission['status'], string> = {
  queued: 'Antre',
  scored: 'Dinilai',
  failed: 'Gagal',
}

const statusColor: Record<MySubmission['status'], 'yellow' | 'green' | 'red'> = {
  queued: 'yellow',
  scored: 'green',
  failed: 'red',
}

export function SubmissionRow({ submission: s }: { submission: MySubmission }) {
  const date = new Date(s.created_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Link
      href={`/competitions/${s.competition.slug}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/50"
    >
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-medium text-neutral-900 dark:text-neutral-100">{s.competition.title}</h4>
        <p className="mt-1 text-xs text-neutral-500">
          {s.filename} · {date}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-semibold text-primary-600">
          {s.public_score ?? '—'}
        </span>
        <Badge color={statusColor[s.status]}>{statusLabel[s.status]}</Badge>
      </div>
    </Link>
  )
}
