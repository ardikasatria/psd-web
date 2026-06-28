import { z } from 'zod'

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
const PREFIX = '/api/v1'

export const API_BASE = BASE
export const API_PREFIX = PREFIX

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${PREFIX}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const e = body?.error ?? {}
    const code = e.code ?? 'unknown'
    const message =
      code === 'rate_limited'
        ? 'Terlalu banyak permintaan, coba lagi sebentar lagi.'
        : (e.message ?? res.statusText)
    throw new ApiError(res.status, code, message, e.details)
  }
  return schema.parse(await res.json())
}

export async function apiFetchForm<T>(
  path: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  formData: FormData,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${PREFIX}${path}`, {
    method: 'POST',
    ...init,
    credentials: 'include',
    headers: {
      ...init.headers,
    },
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const e = body?.error ?? {}
    const code = e.code ?? 'unknown'
    const message =
      code === 'rate_limited'
        ? 'Terlalu banyak permintaan, coba lagi sebentar lagi.'
        : (e.message ?? res.statusText)
    throw new ApiError(res.status, code, message, e.details)
  }
  return schema.parse(await res.json())
}

export async function apiDelete(path: string, init: RequestInit = {}): Promise<void> {
  const res = await fetch(`${BASE}${PREFIX}${path}`, {
    method: 'DELETE',
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const e = body?.error ?? {}
    const code = e.code ?? 'unknown'
    const message =
      code === 'rate_limited'
        ? 'Terlalu banyak permintaan, coba lagi sebentar lagi.'
        : (e.message ?? res.statusText)
    throw new ApiError(res.status, code, message, e.details)
  }
}

export function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
