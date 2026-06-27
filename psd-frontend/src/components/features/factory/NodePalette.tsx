'use client'

import { TRANSFORM_OPS } from '@/lib/factory/specFlow'
import type { PipelineNode } from '@/types/api'
import {
  ArrowDownCircleIcon,
  ArrowPathIcon,
  CircleStackIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

type Props = {
  className?: string
  /** Tanpa border/card — untuk sheet mobile */
  embedded?: boolean
  onAdd: (kind: PipelineNode['type'], op?: PipelineNode['op']) => void
}

const ITEMS: { kind: PipelineNode['type']; op?: PipelineNode['op']; label: string; icon: typeof CircleStackIcon }[] = [
  { kind: 'source', label: 'Source', icon: CircleStackIcon },
  ...TRANSFORM_OPS.map((op) => ({ kind: 'transform' as const, op, label: op as string, icon: ArrowPathIcon })),
  { kind: 'sink', label: 'Sink', icon: ArrowDownCircleIcon },
]

export function NodePalette({ className, embedded = false, onAdd }: Props) {
  return (
    <aside
      className={clsx(
        embedded
          ? 'w-full space-y-3'
          : 'w-full shrink-0 space-y-3 rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800 xl:w-52',
        className,
      )}
    >
      {!embedded && (
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Palet node</h3>
      )}
      <ul className={clsx(embedded ? 'grid gap-2 sm:grid-cols-2' : 'space-y-1.5')}>
        {ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <li key={`${item.kind}-${item.op ?? ''}`}>
              <button
                type="button"
                onClick={() => onAdd(item.kind, item.op)}
                className="flex w-full items-center gap-2 rounded-xl border border-neutral-200/80 bg-neutral-50/80 px-3 py-2 text-left text-sm font-medium text-neutral-800 transition hover:border-primary-300 hover:bg-primary-50/50 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-200 dark:hover:border-primary-800 dark:hover:bg-primary-950/30"
              >
                <Icon className="size-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
                <span className="capitalize">{item.label}</span>
                <PlusIcon className="ms-auto size-3.5 text-neutral-400" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
