'use client'

import { PipelineStatusBadge } from '@/components/features/factory/pipeline-utils'
import type { PipelineStatus } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { ChartBarSquareIcon, CheckIcon, PlayIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

type Props = {
  status: PipelineStatus
  pipelineId?: string
  runsLeft: number
  isSaving: boolean
  isValidating: boolean
  isRunning: boolean
  canRun: boolean
  onSave: () => void
  onValidate: () => void
  onRun: () => void
}

export function PipelineToolbar({
  status,
  pipelineId,
  runsLeft,
  isSaving,
  isValidating,
  isRunning,
  canRun,
  onSave,
  onValidate,
  onRun,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex flex-wrap items-center gap-3">
        <PipelineStatusBadge status={status} />
        <span className="text-xs text-neutral-500 dark:text-neutral-400">Run tersisa hari ini: {runsLeft}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" outline disabled={isSaving} onClick={onSave}>
          {isSaving ? 'Menyimpan…' : 'Simpan'}
        </Button>
        <Button type="button" outline disabled={isValidating} onClick={onValidate}>
          <CheckIcon className="size-4" aria-hidden />
          {isValidating ? 'Memvalidasi…' : 'Validasi'}
        </Button>
        <ButtonPrimary type="button" disabled={!canRun || isRunning} onClick={onRun}>
          <PlayIcon className="size-4" aria-hidden />
          {isRunning ? 'Memulai…' : 'Jalankan'}
        </ButtonPrimary>
        {status === 'valid' && pipelineId && (
          <Link
            href={`/analytics?create=1&pipeline_id=${encodeURIComponent(pipelineId)}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30"
          >
            <ChartBarSquareIcon className="size-4" aria-hidden />
            Dashboard
          </Link>
        )}
      </div>
    </div>
  )
}
