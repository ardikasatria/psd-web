'use client'

import type { PipelineStatus, RunStatus } from '@/types/api'
import clsx from 'clsx'

const STATUS_STYLE: Record<PipelineStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-700 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-600',
  valid: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800',
  error: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800',
}

const STATUS_LABEL: Record<PipelineStatus, string> = {
  draft: 'Draft',
  valid: 'Valid',
  error: 'Error',
}

export function PipelineStatusBadge({ status }: { status: PipelineStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        STATUS_STYLE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

const RUN_STATUS_STYLE: Record<RunStatus, string> = {
  queued: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800',
  running: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800',
  done: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800',
  error: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800',
}

const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  queued: 'Antrian',
  running: 'Berjalan',
  done: 'Selesai',
  error: 'Error',
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        RUN_STATUS_STYLE[status],
      )}
    >
      {RUN_STATUS_LABEL[status]}
    </span>
  )
}
