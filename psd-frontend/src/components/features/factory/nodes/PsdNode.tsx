'use client'

import type { PsdNodeData } from '@/lib/factory/specFlow'
import {
  ArrowDownCircleIcon,
  ArrowPathIcon,
  CircleStackIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import clsx from 'clsx'

const LAYER_CLASS: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
  silver: 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200',
  gold: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-200',
}

const KIND_ICON = {
  source: CircleStackIcon,
  transform: ArrowPathIcon,
  sink: ArrowDownCircleIcon,
}

export function PsdNode({ data, selected }: NodeProps) {
  const d = data as PsdNodeData
  const Icon = KIND_ICON[d.kind] ?? FunnelIcon
  const layer = d.layer ?? '—'
  const label = d.kind === 'transform' ? d.op ?? 'transform' : d.kind

  return (
    <div
      className={clsx(
        'min-w-[140px] rounded-2xl border-2 bg-white px-3 py-2.5 shadow-md transition dark:bg-neutral-800',
        d.error
          ? 'border-red-500 dark:border-red-400'
          : selected
            ? 'border-primary-500 dark:border-primary-400'
            : 'border-neutral-200 dark:border-neutral-600',
      )}
      title={d.error}
    >
      {d.kind !== 'source' && (
        <>
          {d.kind === 'transform' && d.op === 'join' ? (
            <>
              <Handle
                type="target"
                position={Position.Left}
                id="in-0"
                className="!size-2.5 !border-2 !border-neutral-400 !bg-white dark:!bg-neutral-700"
                style={{ top: '35%' }}
              />
              <Handle
                type="target"
                position={Position.Left}
                id="in-1"
                className="!size-2.5 !border-2 !border-neutral-400 !bg-white dark:!bg-neutral-700"
                style={{ top: '65%' }}
              />
            </>
          ) : (
            <Handle
              type="target"
              position={Position.Left}
              className="!size-2.5 !border-2 !border-neutral-400 !bg-white dark:!bg-neutral-700"
            />
          )}
        </>
      )}

      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
        <span className="truncate text-sm font-semibold capitalize text-neutral-900 dark:text-neutral-100">{label}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={clsx(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            LAYER_CLASS[layer] ?? 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
          )}
        >
          {layer}
        </span>
        <span className="text-[10px] uppercase text-neutral-400">{d.kind}</span>
      </div>
      {d.error && <p className="mt-1 line-clamp-2 text-[10px] text-red-600 dark:text-red-400">{d.error}</p>}

      {d.kind !== 'sink' && (
        <Handle
          type="source"
          position={Position.Right}
          className="!size-2.5 !border-2 !border-neutral-400 !bg-white dark:!bg-neutral-700"
        />
      )}
    </div>
  )
}

export const psdNodeTypes = { psdNode: PsdNode }
