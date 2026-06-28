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
    const detail =
      typeof body?.detail === 'string'
        ? body.detail
        : body?.message ?? (body?.error as { message?: string } | undefined)?.message ?? res.statusText
    throw new ApiError(res.status, 'serving_error', detail)
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

export type PredictResult = z.infer<typeof PredictResultSchema>
export type ServingQuota = z.infer<typeof ServingQuotaSchema>

/** name = slug registry atau mlflow_name */
export const predictModel = (name: string, body: { inputs: unknown; stage?: string }) =>
  servingFetch(`/api/models/${encodeURIComponent(name)}/predict`, PredictResultSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const getServingQuota = () => servingFetch('/api/models/me/quota', ServingQuotaSchema)
