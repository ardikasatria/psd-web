import { z } from 'zod'
import { ApiError } from './client'

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

async function biFetch<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
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
    const detail = typeof body?.detail === 'string' ? body.detail : res.statusText
    throw new ApiError(res.status, 'bi_error', detail)
  }
  return schema.parse(await res.json())
}

const GuestTokenSchema = z.object({
  token: z.string(),
  uuid: z.string(),
  supersetDomain: z.string(),
})

const PromoteResponseSchema = z.object({
  dataset_id: z.number().nullable().optional(),
  gold_table: z.string().nullable().optional(),
  embed_uuid: z.string().nullable().optional(),
})

export const fetchGuestToken = (dashboardKey: string) =>
  biFetch('/api/bi/guest-token', GuestTokenSchema, {
    method: 'POST',
    body: JSON.stringify({ dashboard_key: dashboardKey }),
  })

export const promoteDashboardToSuperset = (
  slug: string,
  body: { superset_dashboard_id?: number | null } = {},
) =>
  biFetch(`/api/bi/dashboards/${slug}/promote`, PromoteResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const enableSupersetEmbed = (slug: string, supersetDashboardId: number) =>
  biFetch(
    `/api/bi/dashboards/${slug}/enable-embed`,
    z.object({ embed_uuid: z.string(), superset_dashboard_id: z.number() }),
    {
      method: 'POST',
      body: JSON.stringify({ superset_dashboard_id: supersetDashboardId }),
    },
  )
