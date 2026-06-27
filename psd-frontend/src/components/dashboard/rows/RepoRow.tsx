import { Badge } from '@/shared/Badge'
import { RepoSummary } from '@/types/api'
import Link from 'next/link'

const kindLabel: Record<string, string> = {
  project: 'Proyek',
  dataset: 'Dataset',
  model: 'Model',
}

const kindPath: Record<string, string> = {
  project: 'projects',
  dataset: 'datasets',
  model: 'models',
}

export function RepoRow({ repo: r }: { repo: RepoSummary }) {
  const href = `/${kindPath[r.kind]}/${r.owner.username}/${r.name}`

  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/50"
    >
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-medium text-neutral-900 dark:text-neutral-100">{r.name}</h4>
        <p className="mt-1 line-clamp-1 text-xs text-neutral-500">{r.description}</p>
      </div>
      <Badge color="zinc">{kindLabel[r.kind]}</Badge>
    </Link>
  )
}
