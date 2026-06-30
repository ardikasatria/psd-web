import {
  NotebookDetail,
  NotebookDetailSchema,
  PaginatedNotebookSummary,
  PaginatedNotebookSummarySchema,
} from '@/types/api'
import { IpyNb } from '@/lib/notebooks/ipynb'
import { apiDelete, apiFetch, buildQuery } from './client'
import { z } from 'zod'

export const getNotebooks = (q: { q?: string; category?: string; subcategory?: string; team?: string; page?: number; page_size?: number; mine?: boolean } = {}) =>
  apiFetch<PaginatedNotebookSummary>(`/notebooks${buildQuery(q)}`, PaginatedNotebookSummarySchema)

export const getNotebook = (id: string) =>
  apiFetch<NotebookDetail>(`/notebooks/${id}`, NotebookDetailSchema)

export const createNotebook = (b: {
  title: string
  description: string
  tags: string[]
  source_url?: string | null
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

const NotebookContentSchema = z.object({
  id: z.string(),
  content: z.any(),
})

const NotebookUsageSchema = z.object({
  tier: z.string(),
  owned: z.number(),
  limits: z.object({
    max_notebooks: z.number(),
    max_concurrent_kernels: z.number(),
    runtime: z.string(),
    cpu: z.number(),
    mem_gb: z.number(),
  }),
})

export const BrowserRuntimeSchema = z.object({
  runtime: z.literal('browser'),
  config: z.any(),
})

export const ServerRuntimeSchema = z.object({
  runtime: z.literal('server'),
  provider: z.literal('jupyterhub'),
  base_url: z.string(),
  kernels_url: z.string(),
  ws_base: z.string(),
  token: z.string(),
  expires_in: z.number(),
})

export const NotebookLaunchSchema = z.object({
  notebook_id: z.string(),
  runtime: z.enum(['browser', 'server']),
  config: z.any().optional(),
  provider: z.literal('jupyterhub').optional(),
  base_url: z.string().optional(),
  kernels_url: z.string().optional(),
  ws_base: z.string().optional(),
  token: z.string().optional(),
  expires_in: z.number().optional(),
  hub_url: z.string().optional(),
  spawn_path: z.string().optional(),
  limits: z
    .object({
      cpu: z.number(),
      mem_gb: z.number(),
      max_concurrent_kernels: z.number(),
    })
    .optional(),
})

export type NotebookLaunchResponse = z.infer<typeof NotebookLaunchSchema>

export const RuntimeStatusSchema = z.object({
  ready: z.boolean(),
  pending: z.string().nullable(),
})

export const getNotebookContent = (id: string) =>
  apiFetch<{ id: string; content: IpyNb }>(`/notebooks/${id}/content`, NotebookContentSchema)

export const saveNotebookContent = (id: string, content: IpyNb) =>
  apiFetch<{ id: string; saved: boolean }>(
    `/notebooks/${id}/content`,
    z.object({ id: z.string(), saved: z.boolean() }),
    { method: 'PUT', body: JSON.stringify({ content }) },
  )

export const getNotebookUsage = () => apiFetch(`/notebooks/me/usage`, NotebookUsageSchema)

export const launchNotebook = (id: string, runtime?: 'browser' | 'server') =>
  apiFetch<NotebookLaunchResponse>(`/notebooks/${id}/launch`, NotebookLaunchSchema, {
    method: 'POST',
    body: JSON.stringify(runtime ? { runtime } : {}),
  })

export const stopRuntime = (id: string) =>
  apiFetch(`/notebooks/${id}/stop`, z.object({ stopped: z.boolean() }), { method: 'POST' })

export const runtimeStatus = () => apiFetch(`/notebooks/runtime/status`, RuntimeStatusSchema)
