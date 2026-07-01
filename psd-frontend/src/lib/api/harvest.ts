import { z } from 'zod'
import { apiDelete, apiFetch } from './client'

export const HarvestJobStatusSchema = z.enum([
  'draft',
  'queued',
  'running',
  'completed',
  'failed',
  'canceled',
])
export type HarvestJobStatus = z.infer<typeof HarvestJobStatusSchema>

export const HarvestJobSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: HarvestJobStatusSchema,
  records_written: z.number(),
  result_dataset: z.string().nullable(),
  error: z.string().nullable(),
  source_url: z.string().optional(),
  created_at: z.string().optional(),
})
export type HarvestJob = z.infer<typeof HarvestJobSchema>

export const HarvestPreviewSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
})

export type HarvestJobPayload = {
  name: string
  source_url: string
  method?: string
  params?: Record<string, string>
  auth_type?: 'none' | 'api_key' | 'bearer' | 'basic'
  auth?: Record<string, string>
  pagination?: 'none' | 'page' | 'offset' | 'cursor'
  page_size?: number
  max_pages?: number | null
  max_records?: number | null
  records_path?: string | null
  cursor_path?: string | null
  field_map?: Record<string, string> | null
  rate_per_min?: number
  output_mode?: 'new' | 'version'
  output_format?: 'csv' | 'jsonl' | 'parquet'
  dataset_slug?: string | null
}

export const createJob = (body: HarvestJobPayload) =>
  apiFetch('/harvest/jobs', HarvestJobSchema, { method: 'POST', body: JSON.stringify(body) })

export const runJob = (id: string) =>
  apiFetch(`/harvest/jobs/${id}/run`, z.object({ ok: z.boolean().optional() }).passthrough(), {
    method: 'POST',
  })

export const listJobs = () => apiFetch('/harvest/jobs', z.array(HarvestJobSchema))

export const getJob = (id: string) => apiFetch(`/harvest/jobs/${id}`, HarvestJobSchema)

export const cancelJob = (id: string) =>
  apiFetch(`/harvest/jobs/${id}/cancel`, z.object({ ok: z.boolean().optional() }).passthrough(), {
    method: 'POST',
  })

export const retryJob = (id: string) =>
  apiFetch(`/harvest/jobs/${id}/retry`, z.object({ ok: z.boolean().optional() }).passthrough(), {
    method: 'POST',
  })

export const previewJob = (body: HarvestJobPayload) =>
  apiFetch('/harvest/preview', HarvestPreviewSchema, { method: 'POST', body: JSON.stringify(body) })

export const deleteHarvestJob = (id: string) => apiDelete(`/harvest/jobs/${id}`)
