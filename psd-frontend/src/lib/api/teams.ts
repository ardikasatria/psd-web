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
