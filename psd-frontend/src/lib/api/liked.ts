import {
  LikedAssetSchema,
  LikedListSettingsSchema,
  LikedSummarySchema,
  PaginatedLikedAssetSchema,
} from '@/types/api'
import { z } from 'zod'
import { apiFetch, buildQuery } from './client'

export const getMyLiked = (page = 1) =>
  apiFetch(`/me/liked-assets${buildQuery({ page })}`, PaginatedLikedAssetSchema)

export const getUserLiked = (username: string, page = 1) =>
  apiFetch(`/users/${username}/liked-assets${buildQuery({ page })}`, PaginatedLikedAssetSchema)

export const getLikedSummary = (username: string) =>
  apiFetch(`/users/${username}/liked-assets/summary`, LikedSummarySchema)

export const setItemVisibility = (kind: string, slug: string, is_public: boolean) =>
  apiFetch(
    `/me/liked-assets/${kind}/${slug}/visibility`,
    z.object({ asset_key: z.string().optional(), is_public: z.boolean() }),
    { method: 'PATCH', body: JSON.stringify({ is_public }) },
  )

export const setLikedListSettings = (body: { list_public?: boolean; default_public?: boolean }) =>
  apiFetch(`/me/settings/liked-list`, LikedListSettingsSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export type { LikedAsset } from '@/types/api'
