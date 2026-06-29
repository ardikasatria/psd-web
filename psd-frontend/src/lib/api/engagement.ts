import { AssetStats, AssetStatsSchema, UserEngagementStats, UserEngagementStatsSchema } from '@/types/api'
import { z } from 'zod'
import { apiFetch } from './client'

const assetPath = (kind: string, slug: string) => `/assets/${kind}/${slug}`

export const loveAsset = (kind: string, slug: string) =>
  apiFetch(`${assetPath(kind, slug)}/love`, z.object({ liked: z.boolean(), love_count: z.number() }), {
    method: 'POST',
  })

export const shareAsset = (kind: string, slug: string, channel: 'feed' | 'forum' | 'external' | 'link') =>
  apiFetch(
    `${assetPath(kind, slug)}/share`,
    z.object({ share_count: z.number(), shares: z.record(z.number()) }),
    { method: 'POST', body: JSON.stringify({ channel }) },
  )

export const trackDownload = (kind: string, slug: string) =>
  apiFetch(`${assetPath(kind, slug)}/download`, z.object({ download_count: z.number() }), { method: 'POST' })

export const trackAssetView = (kind: string, slug: string) =>
  apiFetch(`${assetPath(kind, slug)}/view`, z.object({ view_count: z.number() }), { method: 'POST' })

export const getAssetStats = (kind: string, slug: string) =>
  apiFetch<AssetStats>(`${assetPath(kind, slug)}/stats`, AssetStatsSchema)

export const getUserEngagementStats = (username: string) =>
  apiFetch<UserEngagementStats>(`/users/${username}/stats`, UserEngagementStatsSchema)
