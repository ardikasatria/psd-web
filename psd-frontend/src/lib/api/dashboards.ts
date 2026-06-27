import {
  DashboardSchema,
  PaginatedDashboardSummarySchema,
  SlugResponseSchema,
  WidgetDataSchema,
} from '@/types/api'
import { z } from 'zod'
import { apiDelete, apiFetch, buildQuery } from './client'

export const createDashboard = (body: {
  title: string
  description_md?: string
  pipeline_id?: string | null
  team_id?: string | null
  room_id?: string | null
  visibility?: 'private' | 'public'
}) =>
  apiFetch('/dashboards', SlugResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const listDashboards = (q: { page?: number } = {}) =>
  apiFetch(`/dashboards${buildQuery(q)}`, PaginatedDashboardSummarySchema)

export const getDashboard = (slug: string) => apiFetch(`/dashboards/${slug}`, DashboardSchema)

export const updateDashboard = (
  slug: string,
  body: Partial<{
    title: string
    description_md: string
    layout: unknown[]
    visibility: 'private' | 'public'
    pipeline_id: string | null
  }>,
) =>
  apiFetch(`/dashboards/${slug}`, SlugResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteDashboard = (slug: string) => apiDelete(`/dashboards/${slug}`)

export const addWidget = (
  slug: string,
  body: { kind: string; title?: string; query?: Record<string, unknown>; options?: Record<string, unknown> },
) =>
  apiFetch(`/dashboards/${slug}/widgets`, z.object({ id: z.string() }), {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateWidget = (
  slug: string,
  wid: string,
  body: Partial<{ kind: string; title: string; query: Record<string, unknown>; options: Record<string, unknown> }>,
) =>
  apiFetch(`/dashboards/${slug}/widgets/${wid}`, z.object({ id: z.string() }), {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteWidget = (slug: string, wid: string) => apiDelete(`/dashboards/${slug}/widgets/${wid}`)

export const getWidgetData = (slug: string, wid: string) =>
  apiFetch(`/dashboards/${slug}/widgets/${wid}/data`, WidgetDataSchema)
