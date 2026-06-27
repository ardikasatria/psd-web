import { Badge } from '@/shared/Badge'
import { CompetitionSummary } from '@/types/api'
import { TrophyIcon, UsersIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export function CompetitionRow({ competition: c }: { competition: CompetitionSummary }) {
  return (
    <Link
      href={`/competitions/${c.slug}`}
      className="flex items-start justify-between gap-3 rounded-xl border border-neutral-100 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/50"
    >
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-medium text-neutral-900 dark:text-neutral-100">{c.title}</h4>
        <p className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <UsersIcon className="size-3.5" aria-hidden />
            {c.participants} peserta
          </span>
          <span>Metrik: {c.metric}</span>
        </p>
      </div>
      {c.prize_pool && (
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary-600">
          <TrophyIcon className="size-3.5" aria-hidden />
          {c.prize_pool}
        </span>
      )}
      <Badge color="green" className="shrink-0">
        Aktif
      </Badge>
    </Link>
  )
}
