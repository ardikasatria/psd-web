import {
  HARVEST_ALLOWLIST,
  findHarvestJob,
  harvestJobOf,
  jobsForUser,
  mockHarvestJobs,
  type MockHarvestJob,
} from '@/lib/mocks/data/harvest'
import type { HarvestJobPayload } from '@/lib/api/harvest'
import { http, HttpResponse } from 'msw'

type MockUser = { id: string; username: string }

type Deps = {
  API: string
  resolveUserFromRequest: (request: Request) => MockUser | null
  errorResponse: (status: number, code: string, message: string) => HttpResponse
}

function validateUrl(url: string) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false as const, status: 422, code: 'bad_url', message: 'URL tidak valid.' }
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false as const, status: 422, code: 'bad_scheme', message: 'Hanya URL https yang diizinkan.' }
  }
  const host = parsed.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local')) {
    return {
      ok: false as const,
      status: 400,
      code: 'ssrf_blocked',
      message: 'Target internal/privat tidak diizinkan.',
    }
  }
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.)/.test(host)) {
    return {
      ok: false as const,
      status: 400,
      code: 'ssrf_blocked',
      message: 'Target internal/privat tidak diizinkan.',
    }
  }
  const allowed = HARVEST_ALLOWLIST.some((d) => host === d || host.endsWith(`.${d}`))
  if (!allowed) {
    return {
      ok: false as const,
      status: 403,
      code: 'not_allowlisted',
      message: `Domain tidak dalam daftar izin: ${host}. Hubungi admin untuk penambahan.`,
    }
  }
  return { ok: true as const }
}

function samplePreviewRows(url: string) {
  if (url.includes('pokeapi')) {
    return [
      { nama: 'bulbasaur', tipe: 'grass' },
      { nama: 'charmander', tipe: 'fire' },
      { nama: 'squirtle', tipe: 'water' },
    ]
  }
  return [
    { judul: 'sunt aut facere', isi: 'quia et suscipit…', userId: 1 },
    { judul: 'qui est esse', isi: 'est rerum tempore…', userId: 1 },
    { judul: 'ea molestias quasi', isi: 'et iusto sed…', userId: 1 },
  ]
}

function payloadFromBody(body: HarvestJobPayload): Omit<MockHarvestJob, 'id' | 'created_at' | 'run_started_at'> {
  return {
    user_id: '',
    name: body.name,
    source_url: body.source_url,
    method: body.method ?? 'GET',
    params: body.params ?? {},
    auth_type: body.auth_type ?? 'none',
    pagination: body.pagination ?? 'none',
    page_size: body.page_size ?? 50,
    max_pages: body.max_pages ?? null,
    max_records: body.max_records ?? null,
    records_path: body.records_path ?? null,
    cursor_path: body.cursor_path ?? null,
    field_map: body.field_map ?? null,
    rate_per_min: body.rate_per_min ?? 30,
    output_mode: body.output_mode ?? 'new',
    output_format: body.output_format ?? 'csv',
    dataset_slug: body.dataset_slug ?? null,
    status: 'draft',
    records_written: 0,
    result_dataset: null,
    error: null,
  }
}

export function createHarvestHandlers({ API, resolveUserFromRequest, errorResponse }: Deps) {
  return [
    http.get(`${API}/harvest/jobs`, ({ request }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      return HttpResponse.json(jobsForUser(user.id))
    }),

    http.get(`${API}/harvest/jobs/:id`, ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const j = findHarvestJob(String(params.id))
      if (!j || j.user_id !== user.id) return errorResponse(404, 'not_found', 'Job tidak ditemukan')
      tickJobProgress(j)
      return HttpResponse.json(harvestJobOf(j))
    }),

    http.post(`${API}/harvest/jobs`, async ({ request }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const body = (await request.json()) as HarvestJobPayload
      if (!body.name?.trim()) return errorResponse(400, 'empty_name', 'Nama job wajib diisi')
      const urlCheck = validateUrl(body.source_url ?? '')
      if (!urlCheck.ok) return errorResponse(urlCheck.status, urlCheck.code, urlCheck.message)
      const id = `hv_${Date.now()}`
      const job: MockHarvestJob = {
        ...payloadFromBody(body),
        id,
        user_id: user.id,
        created_at: new Date().toISOString(),
        run_started_at: null,
      }
      mockHarvestJobs.push(job)
      return HttpResponse.json(harvestJobOf(job), { status: 201 })
    }),

    http.post(`${API}/harvest/jobs/:id/run`, ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const j = findHarvestJob(String(params.id))
      if (!j || j.user_id !== user.id) return errorResponse(404, 'not_found', 'Job tidak ditemukan')
      if (!['draft', 'failed', 'canceled'].includes(j.status)) {
        return errorResponse(409, 'invalid_transition', `Tak bisa menjalankan dari status '${j.status}'`)
      }
      j.status = 'queued'
      j.records_written = 0
      j.error = null
      j.result_dataset = null
      j.run_started_at = Date.now()
      return HttpResponse.json({ ok: true })
    }),

    http.post(`${API}/harvest/jobs/:id/cancel`, ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const j = findHarvestJob(String(params.id))
      if (!j || j.user_id !== user.id) return errorResponse(404, 'not_found', 'Job tidak ditemukan')
      if (!['draft', 'queued', 'running'].includes(j.status)) {
        return errorResponse(409, 'invalid_transition', 'Job tidak bisa dibatalkan')
      }
      j.status = 'canceled'
      j.run_started_at = null
      return HttpResponse.json({ ok: true })
    }),

    http.post(`${API}/harvest/jobs/:id/retry`, ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const j = findHarvestJob(String(params.id))
      if (!j || j.user_id !== user.id) return errorResponse(404, 'not_found', 'Job tidak ditemukan')
      if (!['failed', 'canceled'].includes(j.status)) {
        return errorResponse(409, 'invalid_transition', 'Hanya job gagal/dibatalkan yang bisa dicoba lagi')
      }
      j.status = 'queued'
      j.error = null
      j.records_written = 0
      j.result_dataset = null
      j.run_started_at = Date.now()
      return HttpResponse.json({ ok: true })
    }),

    http.post(`${API}/harvest/preview`, async ({ request }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const body = (await request.json()) as HarvestJobPayload
      const urlCheck = validateUrl(body.source_url ?? '')
      if (!urlCheck.ok) return errorResponse(urlCheck.status, urlCheck.code, urlCheck.message)
      if (body.source_url?.includes('quota-test')) {
        return errorResponse(429, 'rate_limited', 'Kuota pratinjau habis — coba lagi nanti.')
      }
      return HttpResponse.json({ rows: samplePreviewRows(body.source_url) })
    }),
  ]
}
