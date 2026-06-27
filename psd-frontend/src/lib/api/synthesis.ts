import {
  SynthJob,
  SynthJobCreateResponseSchema,
  SynthJobSchema,
  SynthQuota,
  SynthQuotaSchema,
} from '@/types/api'
import { z } from 'zod'
import { apiFetch } from './client'

export const getSynthQuota = () => apiFetch<SynthQuota>(`/me/synthesis/quota`, SynthQuotaSchema)

export const createSynthJob = (b: {
  prompt?: string
  spec?: Record<string, unknown>
  n_rows: number
  team_id?: string | null
}) =>
  apiFetch(`/synthesis/jobs`, SynthJobCreateResponseSchema, {
    method: 'POST',
    body: JSON.stringify(b),
  })

export const getSynthJob = (id: string) => apiFetch<SynthJob>(`/synthesis/jobs/${id}`, SynthJobSchema)

export const getMySynthJobs = () =>
  apiFetch(`/me/synthesis/jobs`, z.object({ items: z.array(SynthJobSchema) }))

export const publishSynthDataset = (id: string, b: { name?: string; visibility?: 'public' | 'private' }) =>
  apiFetch(`/synthesis/jobs/${id}/publish`, z.object({ dataset_slug: z.string() }), {
    method: 'POST',
    body: JSON.stringify(b),
  })
