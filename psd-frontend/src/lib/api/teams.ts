import {
  PaginatedTeamSummary,
  PaginatedTeamSummarySchema,
  SlugResponseSchema,
  Team,
  TeamInvite,
  TeamJoinRequest,
  TeamSchema,
} from '@/types/api'
import { z } from 'zod'
import { apiDelete, apiFetch, buildQuery } from './client'

const ChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string().nullable().optional(),
})

const TeamMessageSchema = z.object({
  id: z.number(),
  body: z.string().nullable(),
  author: z.object({
    username: z.string(),
    name: z.string().nullable(),
    avatar_url: z.string().nullable(),
  }),
  created_at: z.string().nullable().optional(),
  files: z.array(z.any()).optional(),
})

const TeamFileSchema = z.object({
  id: z.string(),
  filename: z.string(),
  size_bytes: z.number(),
  channel_id: z.string().nullable().optional(),
  message_id: z.number().nullable().optional(),
  uploader: z.object({ username: z.string(), name: z.string().nullable() }),
  created_at: z.string().nullable().optional(),
  download_url: z.string().optional(),
})

const TeamAssetSchema = z.object({
  kind: z.string(),
  ref_id: z.string(),
  title: z.string(),
  path: z.string(),
})

export const createTeam = (b: { name: string; description?: string; visibility?: 'public' | 'private' }) =>
  apiFetch('/teams', SlugResponseSchema, { method: 'POST', body: JSON.stringify(b) })

export const listTeams = (q = '', page = 1) =>
  apiFetch<PaginatedTeamSummary>(`/teams${buildQuery({ q: q || undefined, page })}`, PaginatedTeamSummarySchema)

export const getMyTeams = () =>
  apiFetch('/me/teams', z.object({ items: z.array(z.any()) }))

export const getTeam = (slug: string) => apiFetch<Team>(`/teams/${slug}`, TeamSchema)

export const updateTeam = (slug: string, b: Record<string, unknown>) =>
  apiFetch(`/teams/${slug}`, SlugResponseSchema, { method: 'PATCH', body: JSON.stringify(b) })

export const deleteTeam = (slug: string) => apiDelete(`/teams/${slug}`)

export const leaveTeam = (slug: string) =>
  apiFetch(`/teams/${slug}/leave`, z.object({
    left: z.boolean(),
    team_deleted: z.boolean().optional(),
    successor: z.object({ username: z.string(), name: z.string().nullable() }).optional(),
  }), { method: 'POST' })

export const transferOwner = (slug: string, username: string) =>
  apiFetch(`/teams/${slug}/transfer`, z.object({ owner: z.object({ username: z.string(), name: z.string().nullable() }) }), {
    method: 'POST',
    body: JSON.stringify({ username }),
  })

export const setRole = (slug: string, username: string, role: string) =>
  apiFetch(`/teams/${slug}/members/${username}`, z.object({ role: z.string() }), {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })

export const removeMember = (slug: string, username: string) =>
  apiDelete(`/teams/${slug}/members/${username}`)

export const inviteMember = (slug: string, username: string) =>
  apiFetch(`/teams/${slug}/invites`, z.object({ id: z.string() }), {
    method: 'POST',
    body: JSON.stringify({ username }),
  })

export const getMyInvites = () =>
  apiFetch('/me/team-invites', z.object({ items: z.array(z.any()) })) as Promise<{ items: TeamInvite[] }>

export const respondInvite = (id: string, action: 'accept' | 'decline') =>
  apiFetch(`/me/team-invites/${id}/${action}`, z.any(), { method: 'POST' })

export const requestJoin = (slug: string) =>
  apiFetch(`/teams/${slug}/join-request`, z.object({ id: z.string() }), { method: 'POST' })

export const listJoinRequests = (slug: string) =>
  apiFetch(`/teams/${slug}/join-requests`, z.object({ items: z.array(z.any()) })) as Promise<{
    items: TeamJoinRequest[]
  }>

export const decideRequest = (slug: string, id: string, decision: 'approve' | 'reject') =>
  apiFetch(`/teams/${slug}/join-requests/${id}/${decision}`, z.object({ status: z.string() }), {
    method: 'POST',
  })

export const listTeamAssets = (slug: string, kind?: string) =>
  apiFetch(`/teams/${slug}/assets${kind ? `?kind=${kind}` : ''}`, z.object({ items: z.array(TeamAssetSchema) }))

export const createTeamAsset = (slug: string, kind: string) =>
  apiFetch(`/teams/${slug}/assets`, z.object({ kind: z.string(), create_url: z.string() }), {
    method: 'POST',
    body: JSON.stringify({ kind }),
  })

export const listChannels = (slug: string) =>
  apiFetch(`/teams/${slug}/channels`, z.object({ items: z.array(ChannelSchema) }))

export const createChannel = (slug: string, name: string) =>
  apiFetch(`/teams/${slug}/channels`, ChannelSchema, { method: 'POST', body: JSON.stringify({ name }) })

export const listMessages = (slug: string, channelId: string, page = 1) =>
  apiFetch(
    `/teams/${slug}/channels/${channelId}/messages${buildQuery({ page })}`,
    z.object({ items: z.array(TeamMessageSchema), total: z.number(), page: z.number(), page_size: z.number() }),
  )

export const postMessage = (slug: string, channelId: string, body: { body?: string; file_ids?: string[] }) =>
  apiFetch(`/teams/${slug}/channels/${channelId}/messages`, TeamMessageSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const presignTeamFile = (slug: string, filename: string) =>
  apiFetch(
    `/teams/${slug}/files/presign`,
    z.object({ upload_url: z.string(), storage_key: z.string(), filename: z.string() }),
    { method: 'POST', body: JSON.stringify({ filename }) },
  )

export const registerTeamFile = (
  slug: string,
  meta: { filename: string; size_bytes: number; storage_key: string; channel_id?: string },
) => apiFetch(`/teams/${slug}/files`, TeamFileSchema, { method: 'POST', body: JSON.stringify(meta) })

export const listTeamFiles = (slug: string) =>
  apiFetch(`/teams/${slug}/files`, z.object({ items: z.array(TeamFileSchema) }))
