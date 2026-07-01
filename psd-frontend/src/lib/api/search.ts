import { SearchResponse, SearchResponseSchema, SearchResult, SearchResultSchema } from '@/types/api'
import { apiFetch } from './client'

/** @deprecated Gunakan universalSearch. Dipertahankan untuk kompatibilitas lama. */
export const search = (q: string, type?: 'repos' | 'competitions') =>
  apiFetch<SearchResult>(
    `/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`,
    SearchResultSchema
  )

export const universalSearch = (
  q: string,
  opts?: { type?: string; limit?: number; per_category?: number; page?: number },
) => {
  const params = new URLSearchParams()
  params.set('q', q)
  if (opts?.type) params.set('type', opts.type)
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.per_category) params.set('per_category', String(opts.per_category))
  if (opts?.page) params.set('page', String(opts.page))
  return apiFetch<SearchResponse>(`/search?${params.toString()}`, SearchResponseSchema)
}
