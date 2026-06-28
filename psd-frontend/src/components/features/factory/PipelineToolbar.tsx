'use client'

import { PipelineStatusBadge } from '@/components/features/factory/pipeline-utils'
import type { PipelineStatus } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { ArrowDownTrayIcon, ChartBarSquareIcon, CheckIcon, PlayIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

type Props = {
  status: PipelineStatus
  pipelineId?: string
  engine?: 'auto' | 'duckdb' | 'spark'
  onEngineChange?: (engine: 'auto' | 'duckdb' | 'spark') => void
  scheduleCron?: string
  onScheduleCronChange?: (value: string) => void
  onScheduleCronBlur?: () => void
  isSavingSchedule?: boolean
  canExportDag?: boolean
  isExportingDag?: boolean
  onExportDag?: () => void
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
  engine = 'auto',
  onEngineChange,
  scheduleCron = '',
  onScheduleCronChange,
  onScheduleCronBlur,
  isSavingSchedule = false,
  canExportDag = false,
  isExportingDag = false,
  onExportDag,
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex flex-wrap items-center gap-3">
          <PipelineStatusBadge status={status} />
          {onEngineChange && (
            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              Engine
              <select
                value={engine}
                onChange={(e) => onEngineChange(e.target.value as 'auto' | 'duckdb' | 'spark')}
                className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-900"
              >
                <option value="auto">Auto</option>
                <option value="duckdb">DuckDB</option>
                <option value="spark">Spark</option>
              </select>
            </label>
          )}
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

      {onScheduleCronChange && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            Jadwal Airflow (cron)
            <input
              type="text"
              value={scheduleCron}
              onChange={(e) => onScheduleCronChange(e.target.value)}
              onBlur={onScheduleCronBlur}
              placeholder="0 2 * * *"
              className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-600 dark:bg-neutral-900"
            />
          </label>
          {isSavingSchedule && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Menyimpan jadwal…</span>
          )}
          {onExportDag && (
            <Button type="button" outline disabled={!canExportDag || isExportingDag} onClick={onExportDag}>
              <ArrowDownTrayIcon className="size-4" aria-hidden />
              {isExportingDag ? 'Mengekspor…' : 'Unduh DAG Airflow'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
