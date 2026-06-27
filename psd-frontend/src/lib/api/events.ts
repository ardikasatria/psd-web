import {
  EventDetail,
  EventDetailSchema,
  EventProposalSchema,
  EventStats,
  EventStatsSchema,
  OkResponse,
  OkResponseSchema,
  PaginatedEventProposalSchema,
  PaginatedEventSummary,
  PaginatedEventSummarySchema,
  Registration,
  RegistrationSchema,
} from '@/types/api'
import { z } from 'zod'
import { apiFetch, apiFetchForm, buildQuery } from './client'

export type { EventProposal, PaginatedEventProposal } from '@/types/api'

export type EventsQuery = {
  status?: string
  type?: string
  category?: string
  subcategory?: string
  sort?: 'date' | 'title_asc' | 'title_desc'
  year?: number
  from_date?: string
  to_date?: string
  page?: number
  page_size?: number
}

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export const getEventStats = () => apiFetch<EventStats>('/events/stats', EventStatsSchema)

export const getEvents = (q: EventsQuery = {}) =>
  apiFetch<PaginatedEventSummary>(`/events${buildQuery(q)}`, PaginatedEventSummarySchema)

export const getEvent = (slug: string) => apiFetch<EventDetail>(`/events/${slug}`, EventDetailSchema)

export const registerEvent = (slug: string) =>
  apiFetch<Registration>(`/events/${slug}/register`, RegistrationSchema, { method: 'POST' })

export const cancelEvent = (slug: string) =>
  apiFetch<OkResponse>(`/events/${slug}/register`, OkResponseSchema, { method: 'DELETE' })

export const eventIcsUrl = (slug: string) => `${BASE}/api/v1/events/${slug}/calendar.ics`

export const uploadEventCover = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return apiFetchForm(`/events/upload-cover`, z.object({ cover_url: z.string() }), fd)
}

export const uploadEventMedia = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return apiFetchForm(`/events/upload-media`, z.object({ url: z.string() }), fd)
}

export const listMyEventProposals = (page = 1) =>
  apiFetch(`/me/event-proposals${buildQuery({ page, page_size: 50 })}`, PaginatedEventProposalSchema)

export const getMyEventProposal = (id: string) => apiFetch(`/me/event-proposals/${id}`, EventProposalSchema)

export const createEventProposal = (body: Record<string, unknown>) =>
  apiFetch(`/me/event-proposals`, z.object({ id: z.string(), status: z.string() }), {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateEventProposal = (id: string, body: Record<string, unknown>) =>
  apiFetch(`/me/event-proposals/${id}`, EventProposalSchema, { method: 'PATCH', body: JSON.stringify(body) })

export const submitEventProposal = (id: string) =>
  apiFetch(`/me/event-proposals/${id}/submit`, z.object({ id: z.string(), status: z.string() }), { method: 'POST' })
