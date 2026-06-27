import { PaginatedRepoSummary, PaginatedRepoSummarySchema, UserProfile, UserProfileSchema } from '@/types/api'
import { apiFetch, buildQuery } from './client'

export const getProfile = (username: string) =>
  apiFetch<UserProfile>(`/users/${username}`, UserProfileSchema)

export const getUser = getProfile

export const getUserPortfolio = (
  username: string,
  q: { kind?: string; page?: number; page_size?: number } = {},
) =>
  apiFetch<PaginatedRepoSummary>(
    `/users/${username}/portfolio${buildQuery(q)}`,
    PaginatedRepoSummarySchema,
  )

export const getPortfolio = getUserPortfolio
