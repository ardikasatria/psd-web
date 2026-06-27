import {
  CreateRepoBodySchema,
  Discover,
  DiscoverSchema,
  FileEntrySchema,
  PaginatedRepoSummary,
  PaginatedRepoSummarySchema,
  RepoDetail,
  RepoDetailSchema,
  RepoKind,
  LikeResultSchema,
  UpdateRepoBody,
} from '@/types/api'
import { apiDelete, apiFetch, apiFetchForm, buildQuery } from './client'

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
const PREFIX = '/api/v1'

const kindPath = (kind: RepoKind) => {
  if (kind === 'project') return 'projects'
  if (kind === 'dataset') return 'datasets'
  return 'models'
}

export const getRepos = (
  kind: RepoKind,
  q: { q?: string; tags?: string; sort?: string; category?: string; subcategory?: string; team?: string; page?: number; page_size?: number } = {}
) => apiFetch<PaginatedRepoSummary>(`/${kindPath(kind)}${buildQuery(q)}`, PaginatedRepoSummarySchema)

export const getDiscover = () => apiFetch<Discover>(`/discover`, DiscoverSchema)

export const getRepo = (kind: RepoKind, owner: string, name: string) =>
  apiFetch<RepoDetail>(`/${kindPath(kind)}/${owner}/${name}`, RepoDetailSchema)

export const createRepo = (
  kind: RepoKind,
  body: {
    name: string
    description: string
    visibility: 'public' | 'private'
    tags: string[]
    readme_md?: string
    license?: string | null
    category?: string | null
    subcategory?: string | null
    team_id?: string | null
  }
) =>
  apiFetch<RepoDetail>(`/${kindPath(kind)}`, RepoDetailSchema, {
    method: 'POST',
    body: JSON.stringify(CreateRepoBodySchema.parse(body)),
  })

export const updateRepo = (repoId: string, body: UpdateRepoBody) =>
  apiFetch<RepoDetail>(`/repos/${repoId}`, RepoDetailSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const uploadRepoFile = async (repoId: string, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return apiFetchForm(`/repos/${repoId}/files`, FileEntrySchema, fd)
}

export const deleteRepoFile = (repoId: string, path: string) =>
  apiDelete(`/repos/${repoId}/files?path=${encodeURIComponent(path)}`)

export const likeRepo = (repoId: string) =>
  apiFetch<{ liked: boolean; likes: number }>(`/repos/${repoId}/like`, LikeResultSchema, {
    method: 'POST',
  })

export const unlikeRepo = (repoId: string) =>
  apiFetch<{ liked: boolean; likes: number }>(`/repos/${repoId}/like`, LikeResultSchema, {
    method: 'DELETE',
  })

// Legacy helper for direct fetch (if needed elsewhere)
export const repoFilesUploadUrl = (repoId: string) => `${BASE}${PREFIX}/repos/${repoId}/files`
