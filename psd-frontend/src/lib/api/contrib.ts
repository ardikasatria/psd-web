import { z } from 'zod'
import { apiFetch } from './client'

const PullSummarySchema = z.object({
  number: z.number(),
  title: z.string(),
  state: z.string(),
  author: z.string().nullable().optional(),
  head: z.string().nullable().optional(),
  base: z.string().nullable().optional(),
  mergeable: z.boolean().nullable().optional(),
})

const PullListSchema = z.object({ items: z.array(PullSummarySchema) })

const PullDetailSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().optional(),
  state: z.string(),
  merged: z.boolean(),
  mergeable: z.boolean().nullable().optional(),
  author: z.string().nullable().optional(),
  head: z.string().nullable().optional(),
  base: z.string().nullable().optional(),
  reviews: z.object({
    approved: z.number(),
    changes_requested: z.number(),
    comments: z.number(),
  }),
  can_merge: z.boolean(),
})

export type PullSummary = z.infer<typeof PullSummarySchema>
export type PullDetail = z.infer<typeof PullDetailSchema>

export const listPulls = (repoId: string, state = 'open') =>
  apiFetch(`/repos/${repoId}/pulls?state=${state}`, PullListSchema)

export const getPull = (repoId: string, index: number) =>
  apiFetch(`/repos/${repoId}/pulls/${index}`, PullDetailSchema)

export const createPull = (
  repoId: string,
  body: { title: string; work_branch: string; body?: string; base_branch?: string }
) =>
  apiFetch(`/repos/${repoId}/pulls`, z.object({ number: z.number(), title: z.string().optional() }), {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const reviewPull = (
  repoId: string,
  index: number,
  body: { event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'; body?: string }
) =>
  apiFetch(`/repos/${repoId}/pulls/${index}/review`, z.record(z.unknown()), {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const mergePull = (repoId: string, index: number) =>
  apiFetch(`/repos/${repoId}/pulls/${index}/merge`, z.object({ merged: z.boolean() }), {
    method: 'POST',
    body: JSON.stringify({}),
  })

export const commentPull = (repoId: string, index: number, body: string) =>
  apiFetch(`/repos/${repoId}/pulls/${index}/comments`, z.record(z.unknown()), {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
