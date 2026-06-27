import { CategoryBadge } from '@/components/common/CategoryBadge'
import { FeaturedBadge } from '@/components/common/FeaturedBadge'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { TeamBadge } from '@/components/common/TeamBadge'
import { Badge } from '@/shared/Badge'
import { trackRepoClick } from '@/lib/analytics/entities'
import { RepoSummary } from '@/types/api'
import {
  ArrowDownTrayIcon,
  BeakerIcon,
  ChartBarIcon,
  HeartIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

const CARD_ACCENTS = [
  'from-violet-400 to-indigo-600',
  'from-indigo-400 to-violet-500',
  'from-primary-400 to-indigo-500',
  'from-sky-400 to-indigo-600',
] as const

const FRAMEWORK_TAGS = ['transformer', 'cnn', 'lstm', 'fasttext', 'xgboost', 'tabular'] as const

function formatMetric(key: string, value: number): string {
  if (key === 'mape') return `${(value * 100).toFixed(1)}% MAPE`
  if (key === 'f1') return `F1 ${value.toFixed(2)}`
  if (key === 'accuracy') return `${(value * 100).toFixed(1)}% acc`
  return `${key}: ${value.toFixed(2)}`
}

function inferFramework(tags: string[]): string | null {
  const hit = tags.find((t) => FRAMEWORK_TAGS.includes(t as (typeof FRAMEWORK_TAGS)[number]))
  if (!hit) return null
  const labels: Record<string, string> = {
    transformer: 'Transformer',
    cnn: 'CNN',
    lstm: 'LSTM',
    fasttext: 'FastText',
    xgboost: 'XGBoost',
    tabular: 'Tabular',
  }
  return labels[hit] ?? hit
}

export function ModelCard({ model, index = 0 }: { model: RepoSummary; index?: number }) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
  const href = `/models/${model.owner.username}/${model.name}`
  const framework = inferFramework(model.tags)
  const metrics = model.metrics_preview
    ? Object.entries(model.metrics_preview).slice(0, 2)
    : []

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800">
      <Link
        href={href}
        className="absolute inset-0 z-0 rounded-3xl"
        aria-label={`Model ${model.name} oleh ${model.owner.username}`}
        onClick={() => trackRepoClick(model)}
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
            <BeakerIcon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="line-clamp-2 font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
                {model.name}
              </h3>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                {model.featured && <FeaturedBadge />}
                {framework && (
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                    {framework}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-neutral-500">
              <UserIcon className="size-3.5 shrink-0" aria-hidden />
              {model.owner.username}
              {model.owner.is_official && <OfficialBadge />}
              {model.team && <TeamBadge team={model.team} />}
            </p>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {model.description}
        </p>

        {metrics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {metrics.map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                <ChartBarIcon className="size-3.5" aria-hidden />
                {formatMetric(key, value)}
              </span>
            ))}
          </div>
        )}

        <CategoryBadge category={model.category} subcategory={model.subcategory} className="mt-3" />

        {model.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-700">
            {model.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} color="zinc">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 text-sm text-neutral-500">
          <span className="flex items-center gap-1.5">
            <HeartIcon className="size-4" aria-hidden />
            {model.likes}
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowDownTrayIcon className="size-4" aria-hidden />
            {model.downloads}
          </span>
        </div>
      </div>
    </div>
  )
}
