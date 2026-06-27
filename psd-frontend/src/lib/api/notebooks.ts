import {
  NotebookDetail,
  NotebookDetailSchema,
  PaginatedNotebookSummary,
  PaginatedNotebookSummarySchema,
} from '@/types/api'
import { apiDelete, apiFetch, buildQuery } from './client'

export const getNotebooks = (q: { q?: string; category?: string; subcategory?: string; team?: string; page?: number; page_size?: number } = {}) =>
  apiFetch<PaginatedNotebookSummary>(`/notebooks${buildQuery(q)}`, PaginatedNotebookSummarySchema)

export const getNotebook = (id: string) =>
  apiFetch<NotebookDetail>(`/notebooks/${id}`, NotebookDetailSchema)

export const createNotebook = (b: {
  title: string
  description: string
  tags: string[]
  source_url: string
  category?: string | null
  subcategory?: string | null
  team_id?: string | null
}) =>
  apiFetch<NotebookDetail>(`/notebooks`, NotebookDetailSchema, {
    method: 'POST',
    body: JSON.stringify(b),
  })

export const updateNotebook = (
  id: string,
  b: Partial<{
    title: string
    description: string
    tags: string[]
    source_url: string | null
    category: string | null
    subcategory: string | null
  }>,
) =>
  apiFetch<NotebookDetail>(`/notebooks/${id}`, NotebookDetailSchema, {
    method: 'PATCH',
    body: JSON.stringify(b),
  })

export const deleteNotebook = (id: string) => apiDelete(`/notebooks/${id}`)
