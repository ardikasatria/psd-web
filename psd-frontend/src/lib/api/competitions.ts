import {
  CompDetailStats,
  CompDetailStatsSchema,
  CompNotebook,
  CompNotebookSchema,
  CompetitionDetail,
  CompetitionDetailSchema,
  CompetitionProposalSchema,
  CompetitionStats,
  CompetitionStatsSchema,
  PaginatedAdminCompSubmission,
  PaginatedAdminCompSubmissionSchema,
  PaginatedCompetitionProposalSchema,
  PaginatedCompetitionSummary,
  PaginatedCompetitionSummarySchema,
  PaginatedCompNotebook,
  PaginatedCompNotebookSchema,
  PaginatedLeaderboard,
  PaginatedLeaderboardSchema,
  PaginatedSubmission,
  PaginatedSubmissionSchema,
  Submission,
  SubmissionSchema,
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

export const getCompDetailStats = (slug: string) =>
  apiFetch<CompDetailStats>(`/competitions/${slug}/stats`, CompDetailStatsSchema)

export const getLeaderboard = (
  slug: string,
  board: 'public' | 'private' = 'public',
  page = 1
) => apiFetch<PaginatedLeaderboard>(`/competitions/${slug}/leaderboard${buildQuery({ board, page })}`, PaginatedLeaderboardSchema)

export const getSubmissions = (slug: string, page = 1) =>
  apiFetch<PaginatedSubmission>(`/competitions/${slug}/submissions${buildQuery({ page })}`, PaginatedSubmissionSchema)

export const getMySubmissions = (slug: string) =>
  apiFetch<Submission[]>(`/competitions/${slug}/submissions/me`, z.array(SubmissionSchema))

export const getCompNotebooks = (slug: string, page = 1) =>
  apiFetch<PaginatedCompNotebook>(`/competitions/${slug}/notebooks${buildQuery({ page })}`, PaginatedCompNotebookSchema)

export const createCompNotebook = (slug: string) =>
  apiFetch<CompNotebook>(`/competitions/${slug}/notebooks`, CompNotebookSchema, { method: 'POST' })

export const favoriteCompNotebook = (slug: string, id: string) =>
  apiFetch(`/competitions/${slug}/notebooks/${id}/favorite`, z.object({ favorited: z.boolean(), favorite_count: z.number() }), {
    method: 'POST',
  })

export const submitEntry = (slug: string, body: { team_id?: string; notebook_id?: string; note?: string }) =>
  apiFetch<SubmitResult>(`/competitions/${slug}/submissions`, SubmitResultSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const submitCompetition = (slug: string, file: File, extra?: { team_id?: string; note?: string }) => {
  const formData = new FormData()
  formData.append('file', file)
  if (extra?.team_id) formData.append('team_id', extra.team_id)
  if (extra?.note) formData.append('note', extra.note)
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

export const adminListSubs = (slug: string, status = 'submitted', page = 1) =>
  apiFetch<PaginatedAdminCompSubmission>(
    `/admin/competitions/${slug}/submissions${buildQuery({ status, page })}`,
    PaginatedAdminCompSubmissionSchema
  )

export const adminStartReview = (slug: string, id: string) =>
  apiFetch(`/admin/competitions/${slug}/submissions/${id}/start-review`, z.object({ status: z.string() }), {
    method: 'POST',
  })

export const adminScore = (slug: string, id: string, body: { score: number; note?: string }) =>
  apiFetch(`/admin/competitions/${slug}/submissions/${id}/score`, z.object({ status: z.string(), score: z.number() }), {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const adminReject = (slug: string, id: string, note?: string) =>
  apiFetch(`/admin/competitions/${slug}/submissions/${id}/reject`, z.object({ status: z.string() }), {
    method: 'POST',
    body: JSON.stringify({ note }),
  })

export const adminReopen = (slug: string, id: string) =>
  apiFetch(`/admin/competitions/${slug}/submissions/${id}/reopen`, z.object({ status: z.string() }), {
    method: 'POST',
  })

export { ApiError }
