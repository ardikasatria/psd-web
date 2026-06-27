import { LearningPathSummary } from '@/types/api'
import { PATH_PHASES } from '@/lib/learning/pathItems'
import { MapIcon, RectangleStackIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { Badge } from '@/shared/Badge'

export function PathCard({ path }: { path: LearningPathSummary }) {
  return (
    <Link
      href={`/paths/${path.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
    >
      <div className="relative bg-gradient-to-br from-primary-200/90 via-sky-300/80 to-indigo-400/70 px-6 py-8 dark:border-neutral-700 dark:from-neutral-900 dark:via-neutral-800/95 dark:to-sky-950/45">
        <div className="pointer-events-none absolute -end-8 -bottom-8 size-32 rounded-full bg-white/20 blur-2xl dark:bg-white/5" />
        <div className="pointer-events-none absolute -start-4 -top-4 size-16 rounded-full bg-indigo-200/30 blur-xl dark:bg-indigo-500/10" />
        <MapIcon className="relative size-10 text-white dark:text-primary-100" aria-hidden />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-2 flex flex-wrap gap-1">
          {PATH_PHASES.map((phase) => {
            const n = path.phase_counts?.[phase.key] ?? 0
            if (!n) return null
            return (
              <Badge key={phase.key} color="zinc">
                {phase.label} {n}
              </Badge>
            )
          })}
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
          {path.title}
        </h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {path.description}
        </p>
        <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400">
          <RectangleStackIcon className="size-4" aria-hidden />
          {path.items_count ?? path.courses_count} langkah kurasi
        </p>
      </div>
    </Link>
  )
}
