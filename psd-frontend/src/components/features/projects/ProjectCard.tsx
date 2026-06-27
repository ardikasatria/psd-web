import { CategoryBadge } from '@/components/common/CategoryBadge'
import { FeaturedBadge } from '@/components/common/FeaturedBadge'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { TeamBadge } from '@/components/common/TeamBadge'
import { Badge } from '@/shared/Badge'
import { trackRepoClick } from '@/lib/analytics/entities'
import { RepoSummary } from '@/types/api'
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  FolderIcon,
  HeartIcon,
  PuzzlePieceIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

const CARD_ACCENTS = [
  'from-primary-400 to-indigo-600',
  'from-emerald-400 to-primary-500',
  'from-teal-400 to-indigo-500',
  'from-primary-500 to-sky-600',
] as const

export function ProjectCard({ project, index = 0 }: { project: RepoSummary; index?: number }) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
  const href = `/projects/${project.owner.username}/${project.name}`
  const preview = project.project_preview

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800">
      <Link
        href={href}
        className="absolute inset-0 z-0 rounded-3xl"
        aria-label={`Proyek ${project.name} oleh ${project.owner.username}`}
        onClick={() => trackRepoClick(project)}
      />
      <div className={clsx('pointer-events-none h-1.5 w-full bg-gradient-to-r', accent)} />
      <div className="pointer-events-none flex flex-1 flex-col p-5">
        <div className="flex items-start gap-4">
          <div
            className={clsx(
              'flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
              accent,
            )}
          >
            <FolderIcon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="line-clamp-2 font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
                {project.name}
              </h3>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                {project.featured && <FeaturedBadge />}
                {preview?.has_demo && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <ArrowTopRightOnSquareIcon className="size-3" aria-hidden />
                    Demo
                  </span>
                )}
              </div>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-neutral-500">
              <UserIcon className="size-3.5 shrink-0" aria-hidden />
              {project.owner.username}
              {project.owner.is_official && <OfficialBadge />}
              {project.team && <TeamBadge team={project.team} />}
            </p>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {project.description}
        </p>

        {(preview?.stack?.length || preview?.assets_count != null) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {preview?.assets_count != null && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                <PuzzlePieceIcon className="size-3.5" aria-hidden />
                {preview.assets_count} aset terhubung
              </span>
            )}
            {preview?.stack?.slice(0, 2).map((tech) => (
              <span
                key={tech}
                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        <CategoryBadge category={project.category} subcategory={project.subcategory} className="mt-3" />

        {project.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-700">
            {project.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} color="zinc">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 text-sm text-neutral-500">
          <span className="flex items-center gap-1.5">
            <HeartIcon className="size-4" aria-hidden />
            {project.likes}
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowDownTrayIcon className="size-4" aria-hidden />
            {project.downloads}
          </span>
        </div>
      </div>
    </div>
  )
}
