import type { RunDetail, RunStatus, RunSummary } from '@/types/api'

export type MockPipelineRun = RunDetail & {
  pipeline_slug: string
  owner_id: string
  created_at: string
  started_at: number
  execution_engine?: string | null
}

const demoLayers = {
  bronze: [{ node: 'src1', rows: 1200, uri: 's3://psd-assets/pipelines/run_demo_done/bronze/src1.parquet' }],
  silver: [{ node: 't1', rows: 840, uri: 's3://psd-assets/pipelines/run_demo_done/silver/t1.parquet' }],
  gold: [{ node: 'sink1', rows: 840, uri: 's3://psd-assets/pipelines/run_demo_done/gold/sink1.parquet' }],
}

const demoLineage = {
  src1: { type: 'source', op: null, layer: 'bronze', inputs: [], synthetic_source: false },
  t1: { type: 'transform', op: 'select', layer: 'silver', inputs: ['src1'], synthetic_source: null },
  sink1: { type: 'sink', op: null, layer: 'gold', inputs: ['t1'], synthetic_source: null },
}

export const mockPipelineRuns: MockPipelineRun[] = [
  {
    id: 'run_demo_done',
    pipeline_slug: 'etl-ulasan-bersih',
    owner_id: 'usr_01',
    status: 'done',
    rows_out: 840,
    duration_ms: 4200,
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    started_at: Date.now() - 86_400_000,
    layers: demoLayers,
    lineage: demoLineage,
    error: null,
  },
  {
    id: 'run_demo_error',
    pipeline_slug: 'etl-ulasan-bersih',
    owner_id: 'usr_01',
    status: 'error',
    rows_out: 0,
    duration_ms: 91000,
    created_at: new Date(Date.now() - 172_800_000).toISOString(),
    started_at: Date.now() - 172_800_000,
    layers: {},
    lineage: {},
    error: 'Query interrupted — timeout eksekusi pipeline (90 detik)',
  },
]

export const mockRunsTodayByUser = new Map<string, number>()

export function runsForPipeline(slug: string, userId?: string): RunSummary[] {
  return mockPipelineRuns
    .filter((r) => r.pipeline_slug === slug && (!userId || r.owner_id === userId))
    .map((r) => ({
      id: r.id,
      status: resolveRunStatus(r),
      rows_out: r.rows_out,
      duration_ms: r.duration_ms,
      created_at: r.created_at,
      execution_engine: r.execution_engine ?? null,
    }))
}

export function findMockRun(runId: string): MockPipelineRun | undefined {
  return mockPipelineRuns.find((r) => r.id === runId)
}

/** Simulates queued → running → done for freshly started runs. */
export function resolveRunStatus(run: MockPipelineRun): RunStatus {
  if (run.status !== 'queued' && run.status !== 'running') return run.status
  const age = Date.now() - run.started_at
  if (age < 800) return 'queued'
  if (age < 2800) return 'running'
  run.status = 'done'
  run.duration_ms = age
  run.rows_out = 840
  run.layers = demoLayers
  run.lineage = demoLineage
  return 'done'
}

export function mockRunDetail(run: MockPipelineRun): RunDetail {
  const status = resolveRunStatus(run)
  return {
    id: run.id,
    status,
    rows_out: run.rows_out,
    layers: run.layers,
    lineage: run.lineage,
    error: run.error,
    duration_ms: run.duration_ms,
  }
}

export function incrementRunsToday(userId: string) {
  mockRunsTodayByUser.set(userId, (mockRunsTodayByUser.get(userId) ?? 0) + 1)
}

export function getRunsUsedToday(userId: string) {
  return mockRunsTodayByUser.get(userId) ?? 0
}

export function createMockRun(
  slug: string,
  userId: string,
  opts?: boolean | { forceError?: boolean; execution_engine?: string },
): MockPipelineRun {
  const forceError = typeof opts === 'boolean' ? opts : (opts?.forceError ?? false)
  const execution_engine = typeof opts === 'object' ? opts?.execution_engine : undefined
  const id = `run_${Date.now().toString(36)}`
  const run: MockPipelineRun = {
    id,
    pipeline_slug: slug,
    owner_id: userId,
    status: forceError ? 'error' : 'queued',
    rows_out: 0,
    duration_ms: 0,
    created_at: new Date().toISOString(),
    started_at: Date.now(),
    layers: forceError ? {} : {},
    lineage: forceError ? {} : {},
    error: forceError ? 'Kolom rating tidak ditemukan dalam dataset sumber' : null,
    execution_engine: execution_engine ?? 'duckdb',
  }
  if (forceError) {
    run.duration_ms = 1200
  }
  mockPipelineRuns.unshift(run)
  incrementRunsToday(userId)
  return run
}
