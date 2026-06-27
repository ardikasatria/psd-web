'use client'

import { PipelineStatusBadge } from '@/components/features/factory/pipeline-utils'
import type { PipelineSummary } from '@/types/api'
import { QueueListIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

const ACCENTS = [
  'from-amber-400 to-orange-500',
  'from-orange-400 to-rose-500',
  'from-rose-400 to-primary-500',
  'from-primary-400 to-indigo-500',
] as const

export function PipelineCard({ pipeline, index = 0 }: { pipeline: PipelineSummary; index?: number }) {
  const accent = ACCENTS[index % ACCENTS.length]

  return (
    <Link
      href={`/factory/pipelines/${pipeline.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800"
    >
      <div className={clsx('h-1 w-full bg-gradient-to-r', accent)} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={clsx('flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm', accent)}>
            <QueueListIcon className="size-5" aria-hidden />
          </div>
          <PipelineStatusBadge status={pipeline.status} />
        </div>
        <h3 className="mt-4 line-clamp-2 font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
          {pipeline.title}
        </h3>
        <p className="mt-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">{pipeline.slug}</p>
      </div>
    </Link>
  )
}
