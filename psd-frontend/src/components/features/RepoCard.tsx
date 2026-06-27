import { CategoryBadge } from '@/components/common/CategoryBadge'
import { TeamBadge } from '@/components/common/TeamBadge'
import { SyntheticBadge } from '@/components/common/SyntheticBadge'
import { Badge } from '@/shared/Badge'
import { FeaturedBadge } from '@/components/common/FeaturedBadge'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { RepoSummary } from '@/types/api'
import {
  ArrowDownTrayIcon,
  BeakerIcon,
  CubeIcon,
  FolderIcon,
  HeartIcon,
} from '@heroicons/react/24/outline'
import { trackRepoClick } from '@/lib/analytics/entities'
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

const kindAccent: Record<string, string> = {
  project: 'from-primary-500 to-primary-600',
  dataset: 'from-blue-500 to-indigo-600',
  model: 'from-violet-500 to-purple-600',
}

export function RepoCard({ repo }: { repo: RepoSummary }) {
  const href = `/${kindPath[repo.kind]}/${repo.owner.username}/${repo.name}`
  const Icon = kindIcon[repo.kind] ?? FolderIcon

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
      <Link
        href={href}
        className="absolute inset-0 z-0 rounded-3xl"
        aria-label={`${kindLabel[repo.kind]} ${repo.name} oleh ${repo.owner.username}`}
        onClick={() => trackRepoClick(repo)}
      />
      <div className={clsx('pointer-events-none h-1.5 w-full bg-gradient-to-r', kindAccent[repo.kind])} />
      <div className="pointer-events-none flex flex-1 flex-col p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div
            className={clsx(
              'flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
              kindAccent[repo.kind]
            )}
          >
            <Icon className="size-5" aria-hidden />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {repo.featured && <FeaturedBadge />}
            {repo.synthetic && <SyntheticBadge />}
            <Badge color="zinc">{kindLabel[repo.kind]}</Badge>
          </div>
        </div>
        <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-neutral-500">
          <span>{repo.owner.username}</span>
          {repo.owner.is_official && <OfficialBadge />}
          {repo.team && <TeamBadge team={repo.team} />}
        </p>
        <h3 className="mt-1 line-clamp-1 text-lg font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
          {repo.name}
        </h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {repo.description}
        </p>
        <CategoryBadge category={repo.category} subcategory={repo.subcategory} className="mt-3" />
        {repo.tags.length > 0 && (
          <div className="pointer-events-auto relative z-10 mt-4 flex flex-wrap gap-1.5">
            {repo.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600 transition-colors hover:bg-primary-100 hover:text-primary-700 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-primary-900/40"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center gap-4 border-t border-neutral-100 pt-4 text-sm text-neutral-500 dark:border-neutral-700">
          <span className="flex items-center gap-1.5">
            <HeartIcon className="size-4" aria-hidden />
            {repo.likes}
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowDownTrayIcon className="size-4" aria-hidden />
            {repo.downloads}
          </span>
        </div>
      </div>
    </div>
  )
}
