import { SearchResult, SearchResultSchema } from '@/types/api'
import { apiFetch } from './client'

export const search = (q: string, type?: 'repos' | 'competitions') =>
  apiFetch<SearchResult>(
    `/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`,
    SearchResultSchema
  )
