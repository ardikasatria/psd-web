import { CategoryBadge } from '@/components/common/CategoryBadge'
import { TeamBadge } from '@/components/common/TeamBadge'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { Badge } from '@/shared/Badge'
import { NotebookSummary } from '@/types/api'
import {
  ArrowTopRightOnSquareIcon,
  CodeBracketSquareIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { trackNotebookClick } from '@/lib/analytics/entities'
import clsx from 'clsx'
import Link from 'next/link'

const CARD_ACCENTS = [
  'from-primary-400 to-indigo-500',
  'from-sky-400 to-indigo-600',
  'from-indigo-400 to-violet-500',
  'from-violet-400 to-primary-500',
] as const

export function NotebookCard({ notebook, index = 0 }: { notebook: NotebookSummary; index?: number }) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]

  return (
    <Link
      href={`/notebooks/${notebook.id}`}
      onClick={() => trackNotebookClick(notebook)}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800"
    >
      <div className={clsx('h-1.5 w-full bg-gradient-to-r', accent)} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-4">
          <div className={clsx('flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm', accent)}>
            <CodeBracketSquareIcon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="line-clamp-2 font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
                {notebook.title}
              </h3>
              {notebook.has_colab && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                  <ArrowTopRightOnSquareIcon className="size-3" aria-hidden />
                  Colab
                </span>
              )}
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-neutral-500">
              <UserIcon className="size-3.5 shrink-0" aria-hidden />
              {notebook.owner.username}
              {notebook.owner.is_official && <OfficialBadge />}
              {notebook.team && <TeamBadge team={notebook.team} />}
            </p>
          </div>
        </div>

        {notebook.description_preview && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {notebook.description_preview}
          </p>
        )}

        <CategoryBadge category={notebook.category} subcategory={notebook.subcategory} className="mt-3" />

        {notebook.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-700">
            {notebook.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} color="zinc">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
