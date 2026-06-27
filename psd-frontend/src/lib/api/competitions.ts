import {
  CompetitionDetail,
  CompetitionDetailSchema,
  CompetitionProposalSchema,
  CompetitionStats,
  CompetitionStatsSchema,
  PaginatedCompetitionProposalSchema,
  PaginatedCompetitionSummary,
  PaginatedCompetitionSummarySchema,
  PaginatedLeaderboard,
  PaginatedLeaderboardSchema,
  PaginatedSubmission,
  PaginatedSubmissionSchema,
  SubmitResult,
  SubmitResultSchema,
} from '@/types/api'
import { z } from 'zod'
import { ApiError, apiFetch, apiFetchForm, buildQuery } from './client'

export type { CompetitionProposal, PaginatedCompetitionProposal } from '@/types/api'

export type CompetitionsQuery = {
  status?: 'active' | 'upcoming' | 'past'
  category?: string
  subcategory?: string
  tag?: string
  sort?: 'date' | 'title_asc' | 'title_desc'
  year?: number
  from_date?: string
  to_date?: string
  page?: number
  page_size?: number
}

export const getCompetitionStats = () =>
  apiFetch<CompetitionStats>('/competitions/stats', CompetitionStatsSchema)

export const getCompetitions = (q: CompetitionsQuery = {}) =>
  apiFetch<PaginatedCompetitionSummary>(`/competitions${buildQuery(q)}`, PaginatedCompetitionSummarySchema)

export const getCompetition = (slug: string) =>
  apiFetch<CompetitionDetail>(`/competitions/${slug}`, CompetitionDetailSchema)

export const getLeaderboard = (
  slug: string,
  board: 'public' | 'private' = 'public',
  page = 1
) => apiFetch<PaginatedLeaderboard>(`/competitions/${slug}/leaderboard${buildQuery({ board, page })}`, PaginatedLeaderboardSchema)

export const getSubmissions = (slug: string, page = 1) =>
  apiFetch<PaginatedSubmission>(`/competitions/${slug}/submissions${buildQuery({ page })}`, PaginatedSubmissionSchema)

export const submitCompetition = (slug: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return apiFetchForm<SubmitResult>(`/competitions/${slug}/submissions`, SubmitResultSchema, formData)
}

export const uploadCompetitionCover = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return apiFetchForm(`/competitions/upload-cover`, z.object({ cover_url: z.string() }), fd)
}

export const listMyCompetitionProposals = (page = 1) =>
  apiFetch(`/me/competition-proposals${buildQuery({ page, page_size: 50 })}`, PaginatedCompetitionProposalSchema)

export const getMyCompetitionProposal = (id: string) =>
  apiFetch(`/me/competition-proposals/${id}`, CompetitionProposalSchema)

export const createCompetitionProposal = (body: Record<string, unknown>) =>
  apiFetch(`/me/competition-proposals`, z.object({ id: z.string(), status: z.string() }), {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateCompetitionProposal = (id: string, body: Record<string, unknown>) =>
  apiFetch(`/me/competition-proposals/${id}`, CompetitionProposalSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const submitCompetitionProposal = (id: string) =>
  apiFetch(`/me/competition-proposals/${id}/submit`, z.object({ id: z.string(), status: z.string() }), {
    method: 'POST',
  })

export { ApiError }
