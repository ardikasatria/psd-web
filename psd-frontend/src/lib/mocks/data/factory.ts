import type { DataSource, Pipeline, PipelineSpec, PipelineSummary } from '@/types/api'

export type MockDataSource = DataSource & { owner_id: string }

export type MockPipeline = Pipeline & {
  id: string
  owner_id: string
  deleted_at?: string | null
  deleted_by_id?: string | null
}

const validSpec: PipelineSpec = {
  nodes: [
    { id: 'src1', type: 'source', layer: 'bronze', params: { source_id: 'src_demo_01' }, position: { x: 60, y: 140 } },
    {
      id: 't1',
      type: 'transform',
      op: 'select',
      layer: 'silver',
      params: { columns: ['rating', 'text'] },
      position: { x: 280, y: 120 },
    },
    { id: 'sink1', type: 'sink', layer: 'gold', params: { format: 'parquet' }, position: { x: 520, y: 140 } },
  ],
  edges: [
    { source: 'src1', target: 't1' },
    { source: 't1', target: 'sink1' },
  ],
}

const cyclicSpec: PipelineSpec = {
  nodes: [
    { id: 'src1', type: 'source', layer: 'bronze', params: { source_id: 'src_demo_01' } },
    { id: 't1', type: 'transform', op: 'select', layer: 'silver', params: {} },
    { id: 't2', type: 'transform', op: 'filter', layer: 'silver', params: {} },
  ],
  edges: [
    { source: 'src1', target: 't1' },
    { source: 't1', target: 't2' },
    { source: 't2', target: 't1' },
  ],
}

export const mockDataSources: MockDataSource[] = [
  {
    id: 'src_demo_01',
    name: 'ulasan-marketplace-id',
    uri: 'psd://dataset/psd/ulasan-marketplace-id',
    kind: 'dataset',
    owner_id: 'usr_01',
  },
]

export const mockPipelines: MockPipeline[] = [
  {
    id: 'pl_etl_ulasan',
    slug: 'etl-ulasan-bersih',
    title: 'ETL Ulasan Marketplace Bersih',
    status: 'valid',
    spec: validSpec,
    validation_error: null,
    engine: 'auto',
    schedule_cron: '0 2 * * *',
    team_id: null,
    room_id: null,
    owner_id: 'usr_01',
  },
  {
    id: 'pl_siklus_error',
    slug: 'pipeline-siklus-error',
    title: 'Pipeline Contoh Error (Siklus)',
    status: 'error',
    spec: cyclicSpec,
    validation_error: 'Graf memiliki siklus — pipeline harus DAG (asiklik)',
    team_id: null,
    room_id: null,
    owner_id: 'usr_01',
  },
  {
    id: 'pl_draft_baru',
    slug: 'pipeline-draft-baru',
    title: 'Pipeline Draft Baru',
    status: 'draft',
    spec: { nodes: [], edges: [] },
    validation_error: null,
    team_id: null,
    room_id: null,
    owner_id: 'usr_01',
  },
  {
    id: 'pl_draft_budi',
    slug: 'draft-umkm-budi',
    title: 'Draft ETL UMKM (privat)',
    status: 'draft',
    spec: { nodes: [], edges: [] },
    validation_error: null,
    team_id: null,
    room_id: null,
    owner_id: 'usr_02',
  },
]

export function sourcesForUser(userId: string | undefined): DataSource[] {
  if (!userId) return []
  return mockDataSources.filter((s) => s.owner_id === userId)
}

export function pipelinesForUser(userId: string | undefined): MockPipeline[] {
  if (!userId) return []
  return mockPipelines.filter((p) => p.owner_id === userId && !p.deleted_at)
}

export function pipelineTrashForUser(userId: string | undefined): MockPipeline[] {
  if (!userId) return []
  return mockPipelines.filter((p) => p.owner_id === userId && !!p.deleted_at)
}

export function findMockPipeline(slug: string, opts?: { includeTrashed?: boolean }): MockPipeline | undefined {
  const pl = mockPipelines.find((p) => p.slug === slug)
  if (!pl) return undefined
  if (!opts?.includeTrashed && pl.deleted_at) return undefined
  return pl
}

export function pipelineSummaryOf(p: MockPipeline): PipelineSummary {
  return { id: p.id, slug: p.slug, title: p.title, status: p.status }
}
