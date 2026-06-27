import {
  IdeaRoom,
  PaginatedRoomSummary,
  PaginatedRoomSummarySchema,
  ProblemComponentSchema,
  RoomProblem,
  RoomProblemSchema,
  RoomAssetSchema,
  RoomSchema,
  RoomSubmission,
  RoomSubmissionSchema,
  SlugResponseSchema,
  SolutionTemplate,
  SolutionTemplateSchema,
} from '@/types/api'
import { z } from 'zod'
import { apiDelete, apiFetch, apiFetchForm, buildQuery } from './client'

export const createRoom = (b: {
  title: string
  pitch_md?: string
  cover_url?: string | null
  category?: string | null
  subcategory?: string | null
  max_members?: number | null
  visibility?: 'public' | 'private'
  team_name?: string
}) =>
  apiFetch('/idea-rooms', SlugResponseSchema, { method: 'POST', body: JSON.stringify(b) })

export const listRooms = (q: { status?: string; category?: string; subcategory?: string; page?: number } = {}) =>
  apiFetch<PaginatedRoomSummary>(`/idea-rooms${buildQuery(q)}`, PaginatedRoomSummarySchema)

export const getRoom = (slug: string) => apiFetch<IdeaRoom>(`/idea-rooms/${slug}`, RoomSchema)

export const publishRoom = (slug: string) =>
  apiFetch(`/idea-rooms/${slug}/publish`, z.object({ status: z.string() }), { method: 'POST' })

export const startFraming = (slug: string, framing_hours: number) =>
  apiFetch(`/idea-rooms/${slug}/start-framing`, z.object({ status: z.string(), framing_deadline: z.string() }), {
    method: 'POST',
    body: JSON.stringify({ framing_hours }),
  })

export const closeRoom = (slug: string) =>
  apiFetch(`/idea-rooms/${slug}/close`, z.object({ status: z.string() }), { method: 'POST' })

export const joinRoom = (slug: string) =>
  apiFetch(`/idea-rooms/${slug}/join`, z.object({ joined: z.boolean() }), { method: 'POST' })

export const getComponents = (slug: string) =>
  apiFetch(`/idea-rooms/${slug}/components`, z.object({ items: z.array(ProblemComponentSchema) }))

export const addComponent = (slug: string, kind: string, content_md: string) =>
  apiFetch(`/idea-rooms/${slug}/components`, z.object({ id: z.string() }), {
    method: 'POST',
    body: JSON.stringify({ kind, content_md }),
  })

export const deleteComponent = (slug: string, id: string) =>
  apiDelete(`/idea-rooms/${slug}/components/${id}`)

export const frameProblem = (slug: string) =>
  apiFetch<RoomProblem>(`/idea-rooms/${slug}/frame-problem`, RoomProblemSchema, { method: 'POST' })

export const getProblem = (slug: string) =>
  apiFetch<RoomProblem>(`/idea-rooms/${slug}/problem`, RoomProblemSchema)

export const editProblem = (slug: string, b: Partial<RoomProblem>) =>
  apiFetch<RoomProblem>(`/idea-rooms/${slug}/problem`, RoomProblemSchema, {
    method: 'PATCH',
    body: JSON.stringify(b),
  })

export const generateData = (
  slug: string,
  b: { data_mode: 'synthetic' | 'secondary' | 'collect'; n_rows?: number; secondary_dataset_slug?: string },
) =>
  apiFetch(`/idea-rooms/${slug}/generate-data`, z.object({ status: z.string(), data_mode: z.string() }), {
    method: 'POST',
    body: JSON.stringify(b),
  })

export const getTemplate = (slug: string) =>
  apiFetch<SolutionTemplate>(`/idea-rooms/${slug}/solution-template`, SolutionTemplateSchema)

export const setTemplate = (slug: string, template: SolutionTemplate) =>
  apiFetch<SolutionTemplate>(`/idea-rooms/${slug}/solution-template`, SolutionTemplateSchema, {
    method: 'PATCH',
    body: JSON.stringify({ template }),
  })

export const uploadRoomData = (slug: string, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return apiFetchForm(`/idea-rooms/${slug}/upload-data`, z.object({ dataset_slug: z.string() }), fd)
}

export const submitSolution = (
  slug: string,
  b: {
    notebook_id?: string | null
    result_summary_md?: string
    asset_refs?: { type: string; slug: string }[]
    metrics?: Record<string, unknown>
  },
) =>
  apiFetch(`/idea-rooms/${slug}/submit`, z.object({ id: z.string(), status: z.string() }), {
    method: 'POST',
    body: JSON.stringify(b),
  })

export const getSubmission = (slug: string) =>
  apiFetch<RoomSubmission>(`/idea-rooms/${slug}/submission`, RoomSubmissionSchema)

export const finishRoom = (slug: string, b: { publish_assets?: boolean; visibility?: 'public' | 'private' }) =>
  apiFetch(`/idea-rooms/${slug}/finish`, z.object({ status: z.string() }), {
    method: 'POST',
    body: JSON.stringify(b),
  })

export const uploadRoomCover = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return apiFetchForm(`/idea-rooms/upload-cover`, z.object({ cover_url: z.string() }), fd)
}

export const challengeRoom = (
  slug: string,
  b: {
    title?: string
    sponsor?: string
    metric?: string
    duration_days?: number
    rules_md?: string
    tags?: string[]
  },
) =>
  apiFetch(`/idea-rooms/${slug}/challenge`, z.object({ competition_slug: z.string(), status: z.string() }), {
    method: 'POST',
    body: JSON.stringify(b),
  })

export const publishAssets = (
  slug: string,
  b: { assets: { type: string; slug?: string; id?: string }[]; visibility: 'public' | 'private' },
) =>
  apiFetch(`/idea-rooms/${slug}/publish-assets`, z.object({ published: z.array(z.any()) }), {
    method: 'POST',
    body: JSON.stringify(b),
  })

export const getRoomAssets = (slug: string) =>
  apiFetch(`/idea-rooms/${slug}/assets`, z.object({ items: z.array(RoomAssetSchema) }))
