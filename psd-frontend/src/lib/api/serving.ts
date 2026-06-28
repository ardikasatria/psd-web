import { z } from 'zod'
import { ApiError } from './client'

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

async function servingFetch<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const errObj = body?.error as { message?: string; code?: string } | undefined
    const detail =
      typeof body?.detail === 'string'
        ? body.detail
        : errObj?.message ?? body?.message ?? res.statusText
    throw new ApiError(res.status, errObj?.code ?? 'serving_error', detail)
  }
  return schema.parse(await res.json())
}

const PredictResultSchema = z.object({
  prediction: z.unknown(),
  latency_ms: z.number(),
  quota: z.object({
    used: z.number(),
    limit: z.number(),
    remaining: z.number(),
  }),
  model: z.string().optional(),
})

const ServingQuotaSchema = z.object({
  tier: z.string(),
  limit: z.number(),
  used: z.number(),
  remaining: z.number(),
})

const ScalingResultSchema = z.object({
  model: z.string(),
  desired_replicas: z.number(),
  rps: z.number(),
})

export type PredictResult = z.infer<typeof PredictResultSchema>
export type ServingQuota = z.infer<typeof ServingQuotaSchema>
export type ScalingResult = z.infer<typeof ScalingResultSchema>

export const servingPredictUrl = (slug: string) =>
  `${BASE}/api/models/${encodeURIComponent(slug)}/predict`

/** name = slug registry atau mlflow_name */
export const predictModel = (name: string, body: { inputs: unknown; stage?: string }) =>
  servingFetch(`/api/models/${encodeURIComponent(name)}/predict`, PredictResultSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const getServingQuota = () => servingFetch('/api/models/me/quota', ServingQuotaSchema)

export const getModelScaling = (
  name: string,
  params: {
    rps: number
    target_rps_per_replica?: number
    min_replicas?: number
    max_replicas?: number
  },
) => {
  const q = new URLSearchParams()
  q.set('rps', String(params.rps))
  if (params.target_rps_per_replica != null) {
    q.set('target_rps_per_replica', String(params.target_rps_per_replica))
  }
  if (params.min_replicas != null) q.set('min_replicas', String(params.min_replicas))
  if (params.max_replicas != null) q.set('max_replicas', String(params.max_replicas))
  return servingFetch(`/api/models/${encodeURIComponent(name)}/scaling?${q}`, ScalingResultSchema)
}

export const servingApiBase = () => BASE
