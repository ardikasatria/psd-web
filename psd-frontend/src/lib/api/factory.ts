import {
  DataSourceListSchema,
  FactoryQuotaSchema,
  LayerDownloadSchema,
  PaginatedPipelineSummary,
  PaginatedPipelineSummarySchema,
  Pipeline,
  PipelineSchema,
  PipelineUpdateResultSchema,
  PipelineValidateResultSchema,
  RunDetailSchema,
  RunListSchema,
  RunStartSchema,
  SlugResponseSchema,
  SourceSchemaSchema,
} from '@/types/api'
import { z } from 'zod'
import { apiDelete, apiFetch, buildQuery } from './client'

export const registerSource = (dataset_slug: string, name?: string) =>
  apiFetch('/data-sources', z.object({ id: z.string(), uri: z.string() }), {
    method: 'POST',
    body: JSON.stringify({ dataset_slug, name }),
  })

export const listSources = () => apiFetch('/data-sources', DataSourceListSchema)

export const getSourceSchema = (id: string) => apiFetch(`/data-sources/${id}/schema`, SourceSchemaSchema)

export const deleteSource = (id: string) => apiDelete(`/data-sources/${id}`)

export const createPipeline = (body: {
  title: string
  team_id?: string | null
  room_id?: string | null
  spec?: { nodes: unknown[]; edges: unknown[] }
}) =>
  apiFetch('/pipelines', z.object({ slug: z.string(), status: z.string() }), {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const listPipelines = (q: { page?: number } = {}) =>
  apiFetch<PaginatedPipelineSummary>(`/pipelines${buildQuery(q)}`, PaginatedPipelineSummarySchema)

export const getPipeline = (slug: string) => apiFetch<Pipeline>(`/pipelines/${slug}`, PipelineSchema)

export const updatePipeline = (
  slug: string,
  body: Partial<{
    title: string
    spec: { nodes: unknown[]; edges: unknown[] }
    engine: 'auto' | 'duckdb' | 'spark'
    schedule_cron: string | null
  }>,
) =>
  apiFetch(`/pipelines/${slug}`, PipelineUpdateResultSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const validatePipeline = (slug: string) =>
  apiFetch(`/pipelines/${slug}/validate`, PipelineValidateResultSchema, { method: 'POST' })

export const deletePipeline = (slug: string) => apiDelete(`/pipelines/${slug}`)

export const exportAirflowDag = (slug: string) =>
  apiFetch(`/pipelines/${slug}/airflow-dag`, z.object({ dag_id: z.string(), code: z.string() }))

export const getFactoryQuota = () => apiFetch('/me/factory/quota', FactoryQuotaSchema)

export const runPipeline = (slug: string) =>
  apiFetch(`/pipelines/${slug}/run`, RunStartSchema, { method: 'POST' })

export const listRuns = (slug: string) => apiFetch(`/pipelines/${slug}/runs`, RunListSchema)

export const getRun = (slug: string, runId: string) =>
  apiFetch(`/pipelines/${slug}/runs/${runId}`, RunDetailSchema)

export const downloadLayer = (slug: string, runId: string, uri: string) =>
  apiFetch(
    `/pipelines/${slug}/runs/${runId}/download?${new URLSearchParams({ uri })}`,
    LayerDownloadSchema,
  )
