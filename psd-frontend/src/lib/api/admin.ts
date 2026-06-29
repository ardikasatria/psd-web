import {
  AdminStats,
  AdminStatsSchema,
  AdminUser,
  AdminUserSchema,
  CompetitionSummary,
  CourseSummary,
  EventSummary,
  LearningPathSummary,
  PaginatedAdminUser,
  PaginatedAdminUserSchema,
  PaginatedAdminInstructorApplication,
  PaginatedAdminInstructorApplicationSchema,
  PaginatedAdminNotebookKernelRequest,
  PaginatedAdminNotebookKernelRequestSchema,
  PaginatedAdminCompetitionProposalSchema,
  AdminCompetitionProposalSchema,
  PaginatedAdminEventProposalSchema,
  AdminEventProposalSchema,
  PaginatedEventRegistrationAdmin,
  PaginatedEventRegistrationAdminSchema,
  PaginatedCompetitionSummary,
  PaginatedCompetitionSummarySchema,
  PaginatedCourseSummary,
  PaginatedCourseSummarySchema,
  PaginatedEventSummary,
  PaginatedEventSummarySchema,
  PaginatedLearningPathSummary,
  PaginatedLearningPathSummarySchema,
  PaginatedRepoSummary,
  PaginatedRepoSummarySchema,
  PaginatedThreadSummary,
  PaginatedThreadSummarySchema,
  RepoSummary,
  RepoSummarySchema,
  SlugResponse,
  SlugResponseSchema,
} from '@/types/api'
import { apiDelete, apiFetch, apiFetchForm, buildQuery } from './client'
import { z } from 'zod'

export const getStats = () => apiFetch<AdminStats>('/admin/stats', AdminStatsSchema)
export const getAdminStats = getStats

export const listUsers = (q: { q?: string; page?: number; page_size?: number } = {}) =>
  apiFetch<PaginatedAdminUser>(`/admin/users${buildQuery(q)}`, PaginatedAdminUserSchema)

export const getAdminUsers = listUsers

export const updateUser = (id: string, body: { role?: string; is_active?: boolean }) =>
  apiFetch<AdminUser>(`/admin/users/${id}`, AdminUserSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const updateAdminUser = updateUser

export const deleteUser = (id: string) => apiDelete(`/admin/users/${id}`)

export const listAdminRepos = (q: { q?: string; page?: number; page_size?: number } = {}) =>
  apiFetch<PaginatedRepoSummary>(`/admin/repos${buildQuery(q)}`, PaginatedRepoSummarySchema)

export const updateAdminRepo = (id: string, body: { visibility?: 'public' | 'private'; featured?: boolean }) =>
  apiFetch<RepoSummary>(`/admin/repos/${id}`, RepoSummarySchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteAdminRepo = (id: string) => apiDelete(`/admin/repos/${id}`)

export const createCompetition = (body: Record<string, unknown>) =>
  apiFetch<SlugResponse>('/admin/competitions', SlugResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateCompetition = (slug: string, body: Record<string, unknown>) =>
  apiFetch<SlugResponse>(`/admin/competitions/${slug}`, SlugResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteCompetition = (slug: string) => apiDelete(`/admin/competitions/${slug}`)

export const uploadCompetitionGroundTruth = (slug: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return apiFetchForm<{ ok: boolean }>(`/admin/competitions/${slug}/ground-truth`, z.object({ ok: z.boolean() }), formData)
}

export const listCompetitionProposals = (q: { status?: string; page?: number; page_size?: number } = {}) =>
  apiFetch(
    `/admin/competition-proposals${buildQuery(q)}`,
    PaginatedAdminCompetitionProposalSchema,
  )

export const getCompetitionProposal = (id: string) =>
  apiFetch(`/admin/competition-proposals/${id}`, AdminCompetitionProposalSchema)

export const reviewCompetitionProposal = (
  id: string,
  body: { action: 'approve' | 'revision_requested' | 'reject'; review_note?: string },
) =>
  apiFetch(
    `/admin/competition-proposals/${id}/review`,
    z.object({ status: z.string(), competition_slug: z.string().nullable().optional() }),
    { method: 'PATCH', body: JSON.stringify(body) },
  )

export const createEvent = (body: Record<string, unknown>) =>
  apiFetch<SlugResponse>('/admin/events', SlugResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateEvent = (slug: string, body: Record<string, unknown>) =>
  apiFetch<SlugResponse>(`/admin/events/${slug}`, SlugResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteEvent = (slug: string) => apiDelete(`/admin/events/${slug}`)

export const listEventProposals = (q: { status?: string; page?: number; page_size?: number } = {}) =>
  apiFetch(`/admin/event-proposals${buildQuery(q)}`, PaginatedAdminEventProposalSchema)

export const getEventProposal = (id: string) =>
  apiFetch(`/admin/event-proposals/${id}`, AdminEventProposalSchema)

export const reviewEventProposal = (
  id: string,
  body: { action: 'approve' | 'revision_requested' | 'reject'; review_note?: string },
) =>
  apiFetch(
    `/admin/event-proposals/${id}/review`,
    z.object({ status: z.string(), event_slug: z.string().nullable().optional() }),
    { method: 'PATCH', body: JSON.stringify(body) },
  )

export const createCourse = (body: Record<string, unknown>) =>
  apiFetch<SlugResponse>('/admin/courses', SlugResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateCourse = (slug: string, body: Record<string, unknown>) =>
  apiFetch<SlugResponse>(`/admin/courses/${slug}`, SlugResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteCourse = (slug: string) => apiDelete(`/admin/courses/${slug}`)

export const createLearningPath = (body: Record<string, unknown>) =>
  apiFetch<SlugResponse>('/admin/learning-paths', SlugResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateLearningPath = (slug: string, body: Record<string, unknown>) =>
  apiFetch<SlugResponse>(`/admin/learning-paths/${slug}`, SlugResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteLearningPath = (slug: string) => apiDelete(`/admin/learning-paths/${slug}`)

export const deleteAdminThread = (id: string) => apiDelete(`/admin/threads/${id}`)

export const listInstructorApplications = (q: { status?: string; page?: number; page_size?: number } = {}) =>
  apiFetch<PaginatedAdminInstructorApplication>(
    `/admin/instructor-applications${buildQuery(q)}`,
    PaginatedAdminInstructorApplicationSchema,
  )

export const reviewInstructorApplication = (id: string, status: 'approved' | 'rejected') =>
  apiFetch<{ status: string }>(`/admin/instructor-applications/${id}`, z.object({ status: z.string() }), {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

export const listNotebookKernelRequests = (
  q: { status?: string; applicant_type?: string; page?: number; page_size?: number } = {},
) =>
  apiFetch<PaginatedAdminNotebookKernelRequest>(
    `/admin/notebook-kernel-requests${buildQuery(q)}`,
    PaginatedAdminNotebookKernelRequestSchema,
  )

export const reviewNotebookKernelRequest = (
  id: string,
  body: { status: 'approved' | 'rejected'; review_note?: string },
) =>
  apiFetch<{ status: string }>(`/admin/notebook-kernel-requests/${id}`, z.object({ status: z.string() }), {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const getAdminNotebookKernelKtmUrl = (id: string) =>
  apiFetch(`/admin/notebook-kernel-requests/${id}/ktm-url`, z.object({ url: z.string() }))

export const getEventRegistrations = (slug: string, page = 1) =>
  apiFetch<PaginatedEventRegistrationAdmin>(
    `/admin/events/${slug}/registrations${buildQuery({ page, page_size: 50 })}`,
    PaginatedEventRegistrationAdminSchema,
  )

export const checkInRegistration = (slug: string, id: string, attended: boolean) =>
  apiFetch<{ id: string; attended: boolean }>(
    `/admin/events/${slug}/registrations/${id}`,
    z.object({ id: z.string(), attended: z.boolean() }),
    { method: 'PATCH', body: JSON.stringify({ attended }) },
  )

// Re-export public list endpoints for admin tables
export type {
  CompetitionSummary,
  CourseSummary,
  EventSummary,
  LearningPathSummary,
  PaginatedCompetitionSummary,
  PaginatedCourseSummary,
  PaginatedEventSummary,
  PaginatedLearningPathSummary,
  PaginatedThreadSummary,
}
