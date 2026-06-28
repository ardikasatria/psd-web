'use client'

import { ExecutionEngineBadge, RunStatusBadge } from '@/components/features/factory/pipeline-utils'
import { downloadLayer, getFactoryQuota, getRun, listRuns, runPipeline } from '@/lib/api/factory'
import type { FactoryQuota, Pipeline, RunDetail, RunSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { ApiError } from '@/lib/api/client'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ClockIcon,
  PlayIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useEffect, useState } from 'react'

const LAYER_ORDER = ['bronze', 'silver', 'gold'] as const
const TIMEOUT_S = 90

type Props = {
  slug: string
  pipeline: Pipeline
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} dtk`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PipelineRunsPanel({ slug, pipeline }: Props) {
  const qc = useQueryClient()
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [quotaError, setQuotaError] = useState<string | null>(null)

  const quota = useQuery<FactoryQuota>({
    queryKey: ['factory-quota'],
    queryFn: getFactoryQuota,
  })

  const runs = useQuery({
    queryKey: ['factory-runs', slug],
    queryFn: () => listRuns(slug),
  })

  const runItems = runs.data?.items ?? []

  useEffect(() => {
    if (!selectedRunId && runItems.length > 0) {
      setSelectedRunId(runItems[0].id)
    }
  }, [runItems, selectedRunId])

  const activeRun = useQuery<RunDetail>({
    queryKey: ['factory-run', slug, selectedRunId],
    queryFn: () => getRun(slug, selectedRunId!),
    enabled: !!selectedRunId,
    refetchInterval: (query) => {
      const st = query.state.data?.status
      return st === 'queued' || st === 'running' ? 2000 : false
    },
  })

  const startRun = useMutation({
    mutationFn: () => runPipeline(slug),
    onSuccess: (res) => {
      setQuotaError(null)
      setSelectedRunId(res.run_id)
      qc.invalidateQueries({ queryKey: ['factory-runs', slug] })
      qc.invalidateQueries({ queryKey: ['factory-quota'] })
    },
    onError: (e: Error) => {
      if (e instanceof ApiError && e.status === 429) {
        setQuotaError('Kuota run harian habis. Tingkatkan reputasi untuk tier lebih tinggi.')
      } else {
        setQuotaError(e.message)
      }
    },
  })

  const q = quota.data
  const runsLeft = q ? Math.max(0, q.runs_per_day - q.runs_used_today) : 0
  const canRun = pipeline.status === 'valid' && runsLeft > 0 && !startRun.isPending

  const hasSyntheticSource = Object.values(activeRun.data?.lineage ?? {}).some(
    (node) => node && typeof node === 'object' && (node as { synthetic_source?: boolean }).synthetic_source,
  )

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Eksekusi pipeline</h2>
            {q && (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Run hari ini:{' '}
                <strong className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {q.runs_used_today}/{q.runs_per_day}
                </strong>
                {' · '}maks {q.max_rows.toLocaleString('id-ID')} baris{' · '}maks {q.max_nodes} node
              </p>
            )}
            <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <ClockIcon className="size-3.5" aria-hidden />
              Timeout sandbox {TIMEOUT_S} detik per run
            </p>
          </div>
          <ButtonPrimary type="button" disabled={!canRun} onClick={() => startRun.mutate()}>
            <PlayIcon className="size-4" aria-hidden />
            {startRun.isPending ? 'Memulai…' : 'Jalankan'}
          </ButtonPrimary>
        </div>

        {pipeline.status !== 'valid' && (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
            Pipeline harus berstatus Valid sebelum dijalankan.
          </p>
        )}

        {quotaError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {quotaError}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Riwayat run</h3>
          {runItems.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">Belum ada eksekusi.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {runItems.map((run: RunSummary) => (
                <li key={run.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRunId(run.id)}
                    className={clsx(
                      'w-full rounded-xl border px-3 py-3 text-start transition',
                      selectedRunId === run.id
                        ? 'border-primary-300 bg-primary-50/60 dark:border-primary-800 dark:bg-primary-950/30'
                        : 'border-neutral-200/80 bg-neutral-50/50 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900/40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-neutral-500">{run.id}</span>
                      <div className="flex items-center gap-1.5">
                        <ExecutionEngineBadge engine={run.execution_engine} />
                        <RunStatusBadge status={run.status} />
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                      {formatTime(run.created_at)} · {run.rows_out.toLocaleString('id-ID')} baris ·{' '}
                      {formatDuration(run.duration_ms)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          {!selectedRunId || !activeRun.data ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Pilih run untuk melihat detail.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <RunStatusBadge status={activeRun.data.status} />
                  <ExecutionEngineBadge engine={activeRun.data.execution_engine} />
                  {(activeRun.data.status === 'queued' || activeRun.data.status === 'running') && (
                    <ArrowPathIcon className="size-4 animate-spin text-amber-500" aria-hidden />
                  )}
                </div>
                <span className="font-mono text-xs text-neutral-500">{activeRun.data.id}</span>
              </div>

              {hasSyntheticSource && (
                <div className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/60 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  <SparklesIcon className="mb-1 inline size-3.5" aria-hidden />{' '}
                  <strong>Data Sintesis</strong> — hasil olahan berasal dari sumber sintetis, bukan data resmi.
                </div>
              )}

              {activeRun.data.status === 'error' && activeRun.data.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {activeRun.data.error}
                </div>
              )}

              {activeRun.data.status === 'done' && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {activeRun.data.rows_out.toLocaleString('id-ID')} baris keluaran (gold) ·{' '}
                  {formatDuration(activeRun.data.duration_ms)}
                </p>
              )}

              {LAYER_ORDER.map((layer) => {
                const items = activeRun.data.layers?.[layer] ?? []
                if (!items.length) return null
                return (
                  <div key={layer}>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{layer}</h4>
                    <ul className="mt-2 space-y-2">
                      {items.map((item: { node: string; rows: number; uri: string }) => (
                        <li
                          key={item.node}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200/80 bg-neutral-50/80 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/50"
                        >
                          <div>
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">{item.node}</span>
                            <span className="ms-2 text-xs text-neutral-500">
                              {item.rows.toLocaleString('id-ID')} baris
                            </span>
                          </div>
                          <Button
                            type="button"
                            outline
                            onClick={async () => {
                              try {
                                const res = await downloadLayer(slug, activeRun.data!.id, item.uri)
                                window.open(res.url, '_blank', 'noopener,noreferrer')
                              } catch {
                                window.open(item.uri, '_blank', 'noopener,noreferrer')
                              }
                            }}
                          >
                            <ArrowDownTrayIcon className="size-4" aria-hidden />
                            Parquet
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}

              {Object.keys(activeRun.data.lineage ?? {}).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Lineage</h4>
                  <ul className="mt-2 space-y-2 text-sm">
                    {Object.entries(activeRun.data.lineage).map(([nodeId, meta]) => {
                      const m = meta as {
                        type?: string
                        op?: string | null
                        layer?: string | null
                        inputs?: string[]
                      }
                      return (
                        <li
                          key={nodeId}
                          className="rounded-lg border border-neutral-200/80 bg-neutral-50/50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/40"
                        >
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">{nodeId}</span>
                          <span className="ms-2 text-xs text-neutral-500">
                            {m.type}
                            {m.op ? ` · ${m.op}` : ''}
                            {m.layer ? ` · ${m.layer}` : ''}
                          </span>
                          {(m.inputs?.length ?? 0) > 0 && (
                            <p className="mt-1 text-xs text-neutral-500">← {m.inputs!.join(', ')}</p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
