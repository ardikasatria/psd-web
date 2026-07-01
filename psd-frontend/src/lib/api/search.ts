import {
  SearchHit,
  SearchKind,
  SearchResponse,
  SearchResponseSchema,
  SearchResult,
  SearchResultSchema,
} from '@/types/api'
import { API_BASE, API_PREFIX, ApiError, apiFetch } from './client'

/** @deprecated Gunakan universalSearch. Dipertahankan untuk kompatibilitas lama. */
export const search = (q: string, type?: 'repos' | 'competitions') =>
  apiFetch<SearchResult>(
    `/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`,
    SearchResultSchema
  )

const REPO_KINDS = new Set<SearchKind>(['project', 'dataset', 'model'])

function repoPathPrefix(kind: string): string {
  if (kind === 'dataset') return 'datasets'
  if (kind === 'model') return 'models'
  return 'projects'
}

/** Ubah respons API lama `{repos, competitions, users}` → kontrak universal. */
function adaptLegacySearch(body: unknown, q: string): SearchResponse | null {
  if (!body || typeof body !== 'object') return null
  const raw = body as Record<string, unknown>
  if ('results' in raw && 'grouped' in raw) return null

  const hits: SearchHit[] = []

  for (const repo of (raw.repos as Record<string, unknown>[] | undefined) ?? []) {
    const kind = (repo.kind as SearchKind) ?? 'project'
    const slug = String(repo.slug ?? repo.id ?? '')
    hits.push({
      kind: REPO_KINDS.has(kind) ? kind : 'project',
      id: String(repo.id),
      title: String(repo.name ?? slug),
      subtitle: (repo.description as string | undefined) ?? (repo.owner as string | undefined) ?? null,
      url: `/${repoPathPrefix(kind)}/${slug}`,
    })
  }

  for (const comp of (raw.competitions as Record<string, unknown>[] | undefined) ?? []) {
    const slug = String(comp.slug ?? comp.id ?? '')
    hits.push({
      kind: 'competition',
      id: String(comp.id),
      title: String(comp.title ?? slug),
      subtitle: (comp.sponsor as string | undefined) ?? null,
      url: `/competitions/${slug}`,
    })
  }

  for (const user of (raw.users as Record<string, unknown>[] | undefined) ?? []) {
    const username = String(user.username ?? user.id ?? '')
    hits.push({
      kind: 'user',
      id: String(user.id),
      title: String(user.name ?? username),
      subtitle: `@${username}`,
      url: `/${username}`,
      avatar_url: (user.avatar_url as string | null | undefined) ?? null,
      is_official: Boolean(user.is_official),
    })
  }

  const grouped: Record<string, SearchHit[]> = {}
  for (const hit of hits) {
    if (!grouped[hit.kind]) grouped[hit.kind] = []
    grouped[hit.kind].push(hit)
  }

  return {
    query: { text: q, filters: {} },
    total: hits.length,
    results: hits,
    grouped,
  }
}

export const universalSearch = async (
  q: string,
  opts?: { type?: string; limit?: number; per_category?: number; page?: number },
): Promise<SearchResponse> => {
  const params = new URLSearchParams()
  params.set('q', q)
  if (opts?.type) params.set('type', opts.type)
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.per_category) params.set('per_category', String(opts.per_category))
  if (opts?.page) params.set('page', String(opts.page))

  const res = await fetch(`${API_BASE}${API_PREFIX}/search?${params.toString()}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
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

  const json: unknown = await res.json()
  const parsed = SearchResponseSchema.safeParse(json)
  if (parsed.success) return parsed.data

  const legacy = adaptLegacySearch(json, q)
  if (legacy) return legacy

  return SearchResponseSchema.parse(json)
}
