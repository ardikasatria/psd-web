import {
  Gamification,
  GamificationSchema,
  PaginatedContributor,
  PaginatedContributorSchema,
} from '@/types/api'
import { apiFetch, buildQuery } from './client'

export const getMyGamification = () => apiFetch<Gamification>('/me/gamification', GamificationSchema)

export const getContributors = (page = 1) =>
  apiFetch<PaginatedContributor>(
    `/leaderboard/contributors${buildQuery({ page })}`,
    PaginatedContributorSchema,
  )
