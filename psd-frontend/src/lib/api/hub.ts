import { z } from 'zod'
import { ApiError, API_BASE } from './client'

const HubConfigSchema = z.object({
  hub_url: z.string(),
  enabled: z.boolean(),
  spawn_path: z.string().optional(),
})

export type HubConfig = z.infer<typeof HubConfigSchema>

export async function getHubConfig(): Promise<HubConfig> {
  const res = await fetch(`${API_BASE}/api/hub/config`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail =
      typeof body?.detail === 'string'
        ? body.detail
        : body?.message ?? (body?.error as { message?: string } | undefined)?.message ?? res.statusText
    throw new ApiError(res.status, 'hub_error', detail)
  }
  return HubConfigSchema.parse(await res.json())
}

/** Endpoint backend — verifikasi sesi PSD lalu redirect ke JupyterHub (OAuth otomatis). */
export const hubLaunchUrl = () => `${API_BASE}/api/hub/launch`
