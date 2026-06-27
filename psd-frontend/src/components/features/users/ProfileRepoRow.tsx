import { OfficialBadge } from '@/components/common/OfficialBadge'
import { Badge } from '@/shared/Badge'
import { RepoSummary } from '@/types/api'
import {
  ArrowDownTrayIcon,
  BeakerIcon,
  CubeIcon,
  FolderIcon,
  HeartIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
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

const kindIcon: Record<string, typeof FolderIcon> = {
  project: FolderIcon,
  dataset: CubeIcon,
  model: BeakerIcon,
}

const kindColor: Record<string, string> = {
  project: 'text-primary-600 dark:text-primary-400',
  dataset: 'text-blue-600 dark:text-blue-400',
  model: 'text-violet-600 dark:text-violet-400',
}

function formatUpdated(iso: string) {
  const date = new Date(iso)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ProfileRepoRow({ repo }: { repo: RepoSummary }) {
  const href = `/${kindPath[repo.kind]}/${repo.owner.username}/${repo.name}`
  const Icon = kindIcon[repo.kind] ?? FolderIcon

  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-2xl border border-transparent px-4 py-4 motion-safe:transition-colors hover:border-neutral-200 hover:bg-neutral-50 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/60"
    >
      <div
        className={clsx(
          'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-700/80',
          kindColor[repo.kind]
        )}
      >
        <Icon className="size-5" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-mono text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <span className="text-neutral-500 dark:text-neutral-400">{repo.owner.username}</span>
            <span className="text-neutral-400 dark:text-neutral-500">/</span>
            <span className="group-hover:text-primary-600 dark:group-hover:text-primary-400">
              {repo.name}
            </span>
          </p>
          {repo.owner.is_official && <OfficialBadge />}
          <Badge color="zinc">{kindLabel[repo.kind]}</Badge>
        </div>

        {repo.description && (
          <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
            {repo.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          {repo.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-medium dark:bg-neutral-700"
            >
              {tag}
            </span>
          ))}
          <span>Diperbarui {formatUpdated(repo.updated_at)}</span>
          <span className="flex items-center gap-1">
            <HeartIcon className="size-3.5" aria-hidden />
            {repo.likes}
          </span>
          <span className="flex items-center gap-1">
            <ArrowDownTrayIcon className="size-3.5" aria-hidden />
            {repo.downloads}
          </span>
        </div>
      </div>
    </Link>
  )
}
