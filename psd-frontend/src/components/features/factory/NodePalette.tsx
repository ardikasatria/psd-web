'use client'

import { canUsePySparkNode, canUseSqlNode } from '@/components/features/factory/EngineSelector'
import { getNodeHelp } from '@/lib/factory/nodeHelp'
import { TRANSFORM_OPS } from '@/lib/factory/specFlow'
import type { FactoryEngineLimits } from '@/types/api'
import type { PipelineNode } from '@/types/api'
import {
  ArrowDownCircleIcon,
  ArrowPathIcon,
  CircleStackIcon,
  CodeBracketIcon,
  CommandLineIcon,
  LockClosedIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

type Props = {
  className?: string
  embedded?: boolean
  engineLimits?: FactoryEngineLimits
  onAdd: (kind: PipelineNode['type'], op?: PipelineNode['op']) => void
}

const BASE_TRANSFORMS = TRANSFORM_OPS.filter((op) => op !== 'sql' && op !== 'pyspark')

const ITEMS: {
  kind: PipelineNode['type']
  op?: PipelineNode['op']
  label: string
  icon: typeof CircleStackIcon
  requiresSql?: boolean
  requiresPySpark?: boolean
}[] = [
  { kind: 'source', label: 'Source', icon: CircleStackIcon },
  ...BASE_TRANSFORMS.map((op) => ({
    kind: 'transform' as const,
    op,
    label: op as string,
    icon: ArrowPathIcon,
  })),
  { kind: 'transform', op: 'sql', label: 'SQL', icon: CommandLineIcon, requiresSql: true },
  { kind: 'transform', op: 'pyspark', label: 'PySpark', icon: CodeBracketIcon, requiresPySpark: true },
  { kind: 'sink', label: 'Sink', icon: ArrowDownCircleIcon },
]

export function NodePalette({ className, embedded = false, engineLimits, onAdd }: Props) {
  const sqlOk = canUseSqlNode(engineLimits)
  const pyOk = canUsePySparkNode(engineLimits)

  return (
    <aside
      className={clsx(
        embedded
          ? 'w-full space-y-3'
          : 'w-full shrink-0 space-y-3 rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800 xl:w-64',
        className,
      )}
    >
      {!embedded && (
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Palet node
        </h3>
      )}
      <ul className={clsx(embedded ? 'grid gap-2 sm:grid-cols-2' : 'space-y-1.5')}>
        {ITEMS.map((item) => {
          const Icon = item.icon
          const locked =
            (item.requiresSql && !sqlOk) || (item.requiresPySpark && !pyOk)
          const help = getNodeHelp(item.kind, item.op)
          return (
            <li key={`${item.kind}-${item.op ?? ''}`}>
              <button
                type="button"
                disabled={locked}
                onClick={() => !locked && onAdd(item.kind, item.op)}
                className={clsx(
                  'flex w-full flex-col gap-0.5 rounded-xl border px-3 py-2 text-left text-sm font-medium transition',
                  locked
                    ? 'cursor-not-allowed border-neutral-200/60 bg-neutral-100/50 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900/30'
                    : 'border-neutral-200/80 bg-neutral-50/80 text-neutral-800 hover:border-primary-300 hover:bg-primary-50/50 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-200 dark:hover:border-primary-800 dark:hover:bg-primary-950/30',
                )}
                title={
                  locked
                    ? item.requiresPySpark
                      ? 'Butuh tier Lanjut & akses kernel'
                      : 'Butuh tier Menengah untuk node SQL'
                    : help.summary
                }
              >
                <span className="flex w-full items-center gap-2">
                  <Icon className="size-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
                  <span className="capitalize">{item.label}</span>
                  {locked ? (
                    <LockClosedIcon className="ms-auto size-3.5" aria-hidden />
                  ) : (
                    <PlusIcon className="ms-auto size-3.5 text-neutral-400" aria-hidden />
                  )}
                </span>
                {!locked && !embedded && (
                  <span className="line-clamp-2 ps-6 text-[10px] font-normal leading-snug text-neutral-500 dark:text-neutral-400">
                    {help.summary}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
