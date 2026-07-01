import { demoUser } from './users'
import type { HarvestJob } from '@/lib/api/harvest'

export type MockHarvestJob = HarvestJob & {
  user_id: string
  source_url: string
  method: string
  params: Record<string, string>
  auth_type: string
  pagination: string
  page_size: number
  max_pages: number | null
  max_records: number | null
  records_path: string | null
  cursor_path: string | null
  field_map: Record<string, string> | null
  rate_per_min: number
  output_mode: string
  output_format: string
  dataset_slug: string | null
  run_started_at: number | null
  created_at: string
}

export const HARVEST_ALLOWLIST = [
  'jsonplaceholder.typicode.com',
  'pokeapi.co',
  'api.github.com',
  'dummyjson.com',
]

export const mockHarvestJobs: MockHarvestJob[] = [
  {
    id: 'hv_demo_completed',
    user_id: demoUser.id,
    name: 'Post JSONPlaceholder',
    source_url: 'https://jsonplaceholder.typicode.com/posts',
    method: 'GET',
    params: {},
    auth_type: 'none',
    pagination: 'page',
    page_size: 20,
    max_pages: 5,
    max_records: 100,
    records_path: null,
    cursor_path: null,
    field_map: { judul: 'title', isi: 'body' },
    rate_per_min: 30,
    output_mode: 'new',
    output_format: 'csv',
    dataset_slug: null,
    status: 'completed',
    records_written: 100,
    result_dataset: 'psd/ulasan-marketplace-id',
    error: null,
    run_started_at: null,
    created_at: '2025-03-01T08:00:00Z',
  },
  {
    id: 'hv_demo_failed',
    user_id: demoUser.id,
    name: 'API Internal (gagal)',
    source_url: 'https://localhost/admin',
    method: 'GET',
    params: {},
    auth_type: 'none',
    pagination: 'none',
    page_size: 50,
    max_pages: null,
    max_records: null,
    records_path: null,
    cursor_path: null,
    field_map: null,
    rate_per_min: 30,
    output_mode: 'new',
    output_format: 'jsonl',
    dataset_slug: null,
    status: 'failed',
    records_written: 0,
    result_dataset: null,
    error: 'Target internal/privat tidak diizinkan.',
    run_started_at: null,
    created_at: '2025-03-05T14:00:00Z',
  },
]

export function harvestJobOf(j: MockHarvestJob): HarvestJob {
  return {
    id: j.id,
    name: j.name,
    status: j.status,
    records_written: j.records_written,
    result_dataset: j.result_dataset,
    error: j.error,
    source_url: j.source_url,
    created_at: j.created_at,
  }
}

export function jobsForUser(userId: string) {
  return mockHarvestJobs
    .filter((j) => j.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(harvestJobOf)
}

export function findHarvestJob(id: string) {
  return mockHarvestJobs.find((j) => j.id === id)
}

/** Simulasi progres async berdasarkan waktu sejak run. */
export function tickJobProgress(j: MockHarvestJob) {
  if (!j.run_started_at || j.status === 'canceled' || j.status === 'failed') return
  const elapsed = Date.now() - j.run_started_at
  if (elapsed < 800) {
    j.status = 'queued'
    j.records_written = 0
    return
  }
  if (elapsed < 4000) {
    j.status = 'running'
    const pct = Math.min(1, (elapsed - 800) / 3200)
    const target = j.max_records ?? 80
    j.records_written = Math.floor(target * pct)
    return
  }
  j.status = 'completed'
  j.records_written = j.max_records ?? 80
  const slug =
    j.output_mode === 'version' && j.dataset_slug
      ? j.dataset_slug
      : `psd/harvest-${j.name.toLowerCase().replace(/\s+/g, '-').slice(0, 24)}`
  j.result_dataset = slug
  j.error = null
  j.run_started_at = null
}
