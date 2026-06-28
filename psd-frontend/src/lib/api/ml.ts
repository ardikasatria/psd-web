import { z } from 'zod'
import { ApiError } from './client'

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

async function mlFetch<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = typeof body?.detail === 'string' ? body.detail : body?.message ?? res.statusText
    throw new ApiError(res.status, 'ml_error', detail)
  }
  return schema.parse(await res.json())
}

const RegistrySummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  description_md: z.string().optional(),
  mlflow_name: z.string(),
  repo_id: z.string().nullable().optional(),
  competition_id: z.string().nullable().optional(),
  monitoring_dashboard_id: z.string().nullable().optional(),
  monitoring_gold_uri: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
})

const PaginatedRegistriesSchema = z.object({
  items: z.array(RegistrySummarySchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  pages: z.number(),
})

const ModelVersionSchema = z.object({
  id: z.string(),
  version: z.number(),
  stage: z.string(),
  metrics: z.record(z.unknown()),
  artifact_uri: z.string().nullable().optional(),
  mlflow_model_version: z.string().nullable().optional(),
  submission_id: z.string().nullable().optional(),
  repo_id: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
})

const FeatureDriftSchema = z.object({
  feature: z.string(),
  psi: z.number(),
  status: z.enum(['stable', 'moderate', 'significant', 'ok']),
})

const RegistryDetailSchema = RegistrySummarySchema.extend({
  features: z.array(z.object({ name: z.string(), kind: z.string().optional() })).optional(),
  monitoring_dashboard_slug: z.string().nullable().optional(),
  versions: z.array(ModelVersionSchema),
})

const DriftReportSchema = z.object({
  id: z.string(),
  status: z.string(),
  overall_psi: z.number().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  drift_status: z.enum(['stable', 'moderate', 'significant', 'ok']).nullable().optional(),
  feature_drift: z.array(FeatureDriftSchema).optional(),
  alert_count: z.number().optional(),
  metrics: z.record(z.unknown()).optional(),
  error: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
})

export type DriftReport = z.infer<typeof DriftReportSchema>
export type FeatureDrift = z.infer<typeof FeatureDriftSchema>

export type ModelRegistrySummary = z.infer<typeof RegistrySummarySchema>
export type ModelRegistryDetail = z.infer<typeof RegistryDetailSchema>

export const listModelRegistries = (params: { page?: number } = {}) => {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  const suffix = q.toString() ? `?${q}` : ''
  return mlFetch(`/api/ml/registries${suffix}`, PaginatedRegistriesSchema)
}

export const getModelRegistry = (slug: string) =>
  mlFetch(`/api/ml/registries/${slug}`, RegistryDetailSchema)

export const createModelRegistry = (body: {
  title: string
  repo_id?: string
  competition_id?: string
  reference_source_id?: string
  description_md?: string
}) =>
  mlFetch('/api/ml/registries', RegistrySummarySchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const registerModelVersion = (
  slug: string,
  body: { repo_id?: string; submission_id?: string; metrics?: Record<string, number> },
) =>
  mlFetch(
    `/api/ml/registries/${slug}/versions`,
    z.object({
      id: z.string(),
      version: z.number(),
      metrics: z.record(z.unknown()),
      artifact_uri: z.string().nullable().optional(),
      mlflow_model_version: z.string().nullable().optional(),
    }),
    { method: 'POST', body: JSON.stringify(body) },
  )

export const runDriftCheck = (slug: string, body: { current_source_id?: string; submission_id?: string }) =>
  mlFetch(
    `/api/ml/registries/${slug}/drift/run`,
    z.object({ report_id: z.string(), status: z.string(), task_id: z.string().optional() }),
    { method: 'POST', body: JSON.stringify(body) },
  )

export const listDriftReports = (slug: string) =>
  mlFetch(`/api/ml/registries/${slug}/drift`, z.object({ items: z.array(DriftReportSchema) }))

export const createMonitoringDashboard = (slug: string) =>
  mlFetch(
    `/api/ml/registries/${slug}/monitoring`,
    z.object({ dashboard_slug: z.string(), monitoring_gold_uri: z.string().nullable().optional() }),
    { method: 'POST', body: JSON.stringify({}) },
  )

export const mlflowPublicUrl = () =>
  process.env.NEXT_PUBLIC_MLFLOW_URL ?? 'http://localhost:5000'
