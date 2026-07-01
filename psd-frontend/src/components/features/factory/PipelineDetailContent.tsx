'use client'

import { CompiledScriptPanel } from '@/components/features/factory/CompiledScriptPanel'
import { NodePalette } from '@/components/features/factory/NodePalette'
import { NodePropertiesPanel } from '@/components/features/factory/NodePropertiesPanel'
import { PipelineCanvas } from '@/components/features/factory/PipelineCanvas'
import { PipelineRunsPanel } from '@/components/features/factory/PipelineRunsPanel'
import { PipelineToolbar } from '@/components/features/factory/PipelineToolbar'
import { PipelineStatusBadge } from '@/components/features/factory/pipeline-utils'
import { QueryState } from '@/components/features/QueryState'
import { buildColumnsByNode, type ColumnDef } from '@/lib/factory/columnInference'
import { errorsByNodeId, type PsdNodeData } from '@/lib/factory/specFlow'
import { DEFAULT_MAX_NODES, validatePipelineSpec } from '@/lib/factory/validate'
import {
  compilePipeline,
  exportAirflowDag,
  getFactoryEngineLimits,
  getFactoryQuota,
  getPipeline,
  getSourceSchema,
  listSources,
  previewPipeline,
  runPipeline,
  updatePipeline,
  validatePipeline,
} from '@/lib/api/factory'
import type { Pipeline, PipelineNode, PipelineSpec } from '@/types/api'
import { ApiError } from '@/lib/api/client'
import { ExclamationCircleIcon, CheckCircleIcon, AdjustmentsHorizontalIcon, PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogBody, DialogTitle } from '@/shared/dialog'
import { Button } from '@/shared/Button'

type Props = {
  slug: string
}

export function PipelineDetailContent({ slug }: Props) {
  const qc = useQueryClient()
  const addNodeRef = useRef<((kind: PipelineNode['type'], op?: PipelineNode['op']) => string) | null>(null)
  const deleteNodeRef = useRef<((nodeId: string) => void) | null>(null)
  const [draftSpec, setDraftSpec] = useState<PipelineSpec>({ nodes: [], edges: [] })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [localErrors, setLocalErrors] = useState<string[]>([])
  const [schemas, setSchemas] = useState<Record<string, ColumnDef[]>>({})
  const [runError, setRunError] = useState<string | null>(null)
  const [engine, setEngine] = useState<'auto' | 'duckdb' | 'spark'>('auto')
  const [scheduleCron, setScheduleCron] = useState('')
  const [dagError, setDagError] = useState<string | null>(null)
  const [compiledScript, setCompiledScript] = useState<string | null>(null)
  const [scriptLanguage, setScriptLanguage] = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[] | null>(null)
  const [mobilePanel, setMobilePanel] = useState<'palette' | 'properties' | null>(null)

  const { data, isLoading, isError, error } = useQuery<Pipeline>({
    queryKey: ['factory-pipeline', slug],
    queryFn: () => getPipeline(slug),
  })

  const sources = useQuery({
    queryKey: ['factory-sources'],
    queryFn: listSources,
  })

  const quota = useQuery({
    queryKey: ['factory-quota'],
    queryFn: getFactoryQuota,
  })

  const engineLimits = useQuery({
    queryKey: ['factory-engine-limits'],
    queryFn: getFactoryEngineLimits,
    retry: false,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (data?.spec) setDraftSpec(data.spec)
    if (data?.engine) setEngine(data.engine)
    if (data?.schedule_cron != null) setScheduleCron(data.schedule_cron)
  }, [data?.spec, data?.engine, data?.schedule_cron, slug])

  const sourceIds = useMemo(
    () =>
      [
        ...new Set(
          draftSpec.nodes.filter((n) => n.type === 'source').map((n) => String(n.params?.source_id ?? '')),
        ),
      ].filter(Boolean),
    [draftSpec.nodes],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const next: Record<string, ColumnDef[]> = { ...schemas }
      for (const sid of sourceIds) {
        if (next[sid]?.length) continue
        try {
          const res = await getSourceSchema(sid)
          if (!cancelled) next[sid] = res.columns
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setSchemas(next)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceIds.join(',')])

  const columnsByNode = useMemo(() => buildColumnsByNode(draftSpec, schemas), [draftSpec, schemas])

  const nodeErrors = useMemo(() => errorsByNodeId(localErrors), [localErrors])

  const displayErrors =
    localErrors.length > 0
      ? localErrors
      : data?.validation_error
        ? data.validation_error.split('; ').filter(Boolean)
        : []

  const saveMutation = useMutation({
    mutationFn: (spec: PipelineSpec) => updatePipeline(slug, { spec, engine }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factory-pipeline', slug] })
      qc.invalidateQueries({ queryKey: ['factory-pipelines'] })
    },
  })

  const engineMutation = useMutation({
    mutationFn: (eng: 'auto' | 'duckdb' | 'spark') => updatePipeline(slug, { engine: eng }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factory-pipeline', slug] })
    },
  })

  const handleEngineChange = useCallback(
    (eng: 'auto' | 'duckdb' | 'spark') => {
      setEngine(eng)
      engineMutation.mutate(eng)
    },
    [engineMutation],
  )

  const scheduleMutation = useMutation({
    mutationFn: (cron: string | null) => updatePipeline(slug, { schedule_cron: cron }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factory-pipeline', slug] })
    },
  })

  const handleScheduleBlur = useCallback(() => {
    const trimmed = scheduleCron.trim()
    const next = trimmed || null
    if (next === (data?.schedule_cron ?? null)) return
    scheduleMutation.mutate(next)
  }, [scheduleCron, data?.schedule_cron, scheduleMutation])

  const exportDagMutation = useMutation({
    mutationFn: () => exportAirflowDag(slug),
    onSuccess: (dag) => {
      setDagError(null)
      const blob = new Blob([dag.code], { type: 'text/x-python;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${dag.dag_id}.py`
      anchor.click()
      URL.revokeObjectURL(url)
    },
    onError: (e: Error) => {
      setDagError(e instanceof ApiError ? e.message : e.message)
    },
  })

  const validateMutation = useMutation({
    mutationFn: () => validatePipeline(slug),
    onSuccess: async (res) => {
      setLocalErrors(res.errors)
      const script = res.compiled_script ?? res.compiled_sql
      if (script) {
        setCompiledScript(script)
        setScriptLanguage(res.script_language ?? (engine === 'spark' ? 'pyspark' : 'sql'))
      } else {
        const eng = engine === 'auto' ? (engineLimits.data?.suggested_engine ?? 'duckdb') : engine
        try {
          const compiled = await compilePipeline(slug, eng)
          setCompiledScript(compiled.script)
          setScriptLanguage(compiled.language)
        } catch {
          /* optional */
        }
      }
      qc.invalidateQueries({ queryKey: ['factory-pipeline', slug] })
      qc.invalidateQueries({ queryKey: ['factory-pipelines'] })
    },
  })

  const previewMutation = useMutation({
    mutationFn: () => previewPipeline(slug),
    onSuccess: (res) => setPreviewRows(res.rows),
    onError: (e: Error) => setRunError(e.message),
  })

  const runMutation = useMutation({
    mutationFn: () => runPipeline(slug),
    onSuccess: () => {
      setRunError(null)
      qc.invalidateQueries({ queryKey: ['factory-runs', slug] })
      qc.invalidateQueries({ queryKey: ['factory-quota'] })
    },
    onError: (e: Error) => {
      if (e instanceof ApiError) {
        if (e.code === 'engine_locked') {
          setRunError('Engine terkunci untuk tier Anda. Buka panduan atau naik tier.')
          return
        }
        if (e.code === 'quota_exceeded' || e.status === 429) {
          setRunError('Kuota run harian habis.')
          return
        }
        if (e.status === 413) {
          setRunError('Ukuran data melebihi batas tier. Perkecil data atau naik tier.')
          return
        }
      }
      setRunError(e instanceof ApiError && e.status === 429 ? 'Kuota run harian habis.' : e.message)
    },
  })

  const handleSave = useCallback(() => {
    setLocalErrors(validatePipelineSpec(draftSpec, DEFAULT_MAX_NODES))
    saveMutation.mutate(draftSpec)
  }, [draftSpec, saveMutation])

  const handleValidate = useCallback(() => {
    saveMutation.mutate(draftSpec, {
      onSuccess: () => validateMutation.mutate(),
    })
  }, [draftSpec, saveMutation, validateMutation])

  const updateNode = useCallback((nodeId: string, patch: Partial<PsdNodeData>) => {
    setDraftSpec((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => {
        if (n.id !== nodeId) return n
        return {
          ...n,
          ...(patch.layer !== undefined ? { layer: patch.layer } : {}),
          ...(patch.op !== undefined ? { op: patch.op } : {}),
          params: patch.params ?? n.params,
        }
      }),
    }))
  }, [])

  const handleAddNode = useCallback(
    (kind: PipelineNode['type'], op?: PipelineNode['op']) => {
      const id = addNodeRef.current?.(kind, op)
      if (id) {
        setSelectedId(id)
        if (typeof window !== 'undefined' && window.innerWidth < 1280) {
          setMobilePanel('properties')
          return
        }
      }
      setMobilePanel(null)
    },
    [],
  )

  const handleDeleteNode = useCallback((nodeId: string) => {
    deleteNodeRef.current?.(nodeId)
    setSelectedId((cur) => (cur === nodeId ? null : cur))
    setMobilePanel(null)
  }, [])

  const registerAddNode = useCallback((fn: (kind: PipelineNode['type'], op?: PipelineNode['op']) => string) => {
    addNodeRef.current = fn
  }, [])

  const registerDeleteNode = useCallback((fn: (nodeId: string) => void) => {
    deleteNodeRef.current = fn
  }, [])

  const q = quota.data
  const runsLeft = q ? Math.max(0, q.runs_per_day - q.runs_used_today) : 0
  const status = data?.status ?? 'draft'
  const canRun = status === 'valid' && runsLeft > 0

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
        <Link href="/factory/pipelines" className="hover:text-primary-600 dark:hover:text-primary-400">
          Pabrik Data
        </Link>
        <span>/</span>
        <span className="text-neutral-800 dark:text-neutral-200">{data?.title ?? slug}</span>
      </div>

      <QueryState isLoading={isLoading} isError={isError} error={error} skeletonColumns={2}>
        {data && (
          <>
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800 sm:p-8">
              <div className="mb-2">
                <PipelineStatusBadge status={data.status} />
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 sm:text-3xl">{data.title}</h1>
              <p className="mt-1 font-mono text-sm text-neutral-500 dark:text-neutral-400">{data.slug}</p>

              {displayErrors.length > 0 && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-300">
                    <ExclamationCircleIcon className="size-4" aria-hidden />
                    Validasi gagal
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-300">
                    {displayErrors.map((e: string) => (
                      <li key={e}>• {e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {data.status === 'valid' && displayErrors.length === 0 && (
                <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <CheckCircleIcon className="size-4 shrink-0" aria-hidden />
                  Pipeline valid — siap dijalankan.
                </div>
              )}
            </div>

            <PipelineToolbar
              status={data.status}
              pipelineId={data.id}
              engine={engine}
              engineLimits={engineLimits.data}
              onEngineChange={handleEngineChange}
              scheduleCron={scheduleCron}
              onScheduleCronChange={setScheduleCron}
              onScheduleCronBlur={handleScheduleBlur}
              isSavingSchedule={scheduleMutation.isPending}
              canExportDag={!!scheduleCron.trim() && data.status === 'valid'}
              isExportingDag={exportDagMutation.isPending}
              onExportDag={() => exportDagMutation.mutate()}
              runsLeft={runsLeft}
              isSaving={saveMutation.isPending}
              isValidating={validateMutation.isPending}
              isPreviewing={previewMutation.isPending}
              isRunning={runMutation.isPending}
              canRun={canRun}
              onSave={handleSave}
              onValidate={handleValidate}
              onPreview={() => previewMutation.mutate()}
              onRun={() => runMutation.mutate()}
            />

            <CompiledScriptPanel script={compiledScript} language={scriptLanguage} />

            {previewRows && previewRows.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-800">
                <div className="border-b border-neutral-200/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-700">
                  Pratinjau ({previewRows.length} baris)
                </div>
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-700">
                      {Object.keys(previewRows[0]!).map((k) => (
                        <th key={k} className="px-3 py-2 font-semibold text-neutral-600 dark:text-neutral-300">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 10).map((row, ri) => (
                      <tr key={ri} className="border-b border-neutral-50 dark:border-neutral-800">
                        {Object.values(row).map((v, ci) => (
                          <td key={ci} className="max-w-[10rem] truncate px-3 py-1.5 text-neutral-700 dark:text-neutral-300">
                            {String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {dagError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                {dagError}
              </div>
            )}

            {runError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {runError}
              </div>
            )}

            <div className="relative pb-20 xl:pb-0">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                <NodePalette
                  className="hidden xl:block"
                  engineLimits={engineLimits.data}
                  onAdd={handleAddNode}
                />
                {data.spec && (
                  <PipelineCanvas
                    key={slug}
                    pipelineSlug={slug}
                    initialSpec={data.spec}
                    liveSpec={draftSpec}
                    onSpecChange={setDraftSpec}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    nodeErrors={nodeErrors}
                    registerAddNode={registerAddNode}
                    registerDeleteNode={registerDeleteNode}
                  />
                )}
                <NodePropertiesPanel
                  className="hidden xl:block"
                  nodeId={selectedId}
                  spec={draftSpec}
                  columnsByNode={columnsByNode}
                  sources={sources.data?.items ?? []}
                  onUpdate={updateNode}
                  onDelete={handleDeleteNode}
                />
              </div>

              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/90 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-900/95 xl:hidden">
                <div className="mx-auto flex max-w-[1400px] gap-2">
                  <Button
                    type="button"
                    outline
                    className="flex-1 justify-center gap-2"
                    onClick={() => setMobilePanel('palette')}
                  >
                    <PlusCircleIcon className="size-5 shrink-0" aria-hidden />
                    Tambah node
                  </Button>
                  <Button
                    type="button"
                    outline
                    className="relative flex-1 justify-center gap-2"
                    disabled={!selectedId}
                    onClick={() => setMobilePanel('properties')}
                  >
                    <AdjustmentsHorizontalIcon className="size-5 shrink-0" aria-hidden />
                    Properti
                    {selectedId && (
                      <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary-500 ring-2 ring-white dark:ring-neutral-900" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    outline
                    className="shrink-0 justify-center gap-2 !px-3 text-red-600 dark:text-red-400"
                    disabled={!selectedId}
                    onClick={() => selectedId && handleDeleteNode(selectedId)}
                    aria-label="Hapus node"
                  >
                    <TrashIcon className="size-5 shrink-0" aria-hidden />
                  </Button>
                </div>
              </div>
            </div>

            <Dialog open={mobilePanel === 'palette'} onClose={() => setMobilePanel(null)} size="lg">
              <DialogTitle>Palet node</DialogTitle>
              <DialogBody className="mt-4 max-h-[min(70dvh,520px)] overflow-y-auto">
                <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
                  Ketuk jenis node untuk menambahkannya ke kanvas.
                </p>
                <NodePalette embedded engineLimits={engineLimits.data} onAdd={handleAddNode} />
              </DialogBody>
            </Dialog>

            <Dialog open={mobilePanel === 'properties'} onClose={() => setMobilePanel(null)} size="lg">
              <DialogTitle>Properti node</DialogTitle>
              <DialogBody className="mt-4 max-h-[min(75dvh,560px)] overflow-y-auto">
                <NodePropertiesPanel
                  className="!w-full !border-0 !bg-transparent !p-0"
                  nodeId={selectedId}
                  spec={draftSpec}
                  columnsByNode={columnsByNode}
                  sources={sources.data?.items ?? []}
                  onUpdate={updateNode}
                  onDelete={handleDeleteNode}
                />
              </DialogBody>
            </Dialog>

            <PipelineRunsPanel slug={slug} pipeline={data} />
          </>
        )}
      </QueryState>
    </div>
  )
}
