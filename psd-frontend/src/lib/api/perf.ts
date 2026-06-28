import { z } from 'zod'
import { ApiError } from './client'

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

async function perfFetch<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
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
    throw new ApiError(res.status, 'perf_error', detail)
  }
  return schema.parse(await res.json())
}

const MetricStatsSchema = z.object({
  count: z.number(),
  mean: z.number(),
  p50: z.number(),
  p95: z.number(),
  max: z.number(),
})

const PerfStatsSchema = z.object({
  enabled: z.boolean(),
  cache_enabled: z.boolean().optional(),
  cache_auto: z.boolean().optional(),
  threshold_ms: z.number().optional(),
  min_samples: z.number().optional(),
  metrics: z.record(MetricStatsSchema).optional(),
  should_cache: z.record(z.boolean()).optional(),
})

export type PerfStats = z.infer<typeof PerfStatsSchema>
export type MetricStats = z.infer<typeof MetricStatsSchema>

export const getPerfStats = () => perfFetch('/api/perf/stats', PerfStatsSchema)
