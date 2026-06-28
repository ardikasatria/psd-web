import { z } from 'zod'
import { ApiError } from './client'

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

async function assistantFetch<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
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
    const detail =
      typeof body?.detail === 'string'
        ? body.detail
        : body?.message ?? (body?.error as { message?: string } | undefined)?.message ?? res.statusText
    throw new ApiError(res.status, 'assistant_error', detail)
  }
  return schema.parse(await res.json())
}

const QuotaSchema = z.object({
  tier: z.string(),
  limit: z.number(),
  used: z.number(),
  remaining: z.number(),
})

const AskResultSchema = z.object({
  reply: z.string(),
  quota: QuotaSchema,
})

const FeedItemSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  title: z.string(),
  href: z.string().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

const FeedSectionSchema = z.union([
  z.object({
    type: z.literal('next_steps'),
    title: z.string(),
    items: z.array(
      z.object({
        action: z.string(),
        text: z.string(),
        href: z.string().optional(),
      }),
    ),
  }),
  z.object({
    type: z.literal('recommendation'),
    kind: z.string(),
    title: z.string(),
    items: z.array(FeedItemSchema),
  }),
])

const FeedResponseSchema = z.object({
  feed: z.array(FeedSectionSchema),
  strategy: z.enum(['popularity', 'affinity']),
})

export type AssistantQuota = z.infer<typeof QuotaSchema>
export type AskResult = z.infer<typeof AskResultSchema>
export type FeedSection = z.infer<typeof FeedSectionSchema>
export type PersonalizedFeed = z.infer<typeof FeedResponseSchema>

export const askAssistant = (body: { question: string; context?: Record<string, string> }) =>
  assistantFetch('/api/assistant/ask', AskResultSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const getAssistantQuota = () => assistantFetch('/api/assistant/quota', QuotaSchema)

export const getPersonalizedFeed = (kinds?: string) =>
  assistantFetch(`/api/feed${kinds ? `?kinds=${encodeURIComponent(kinds)}` : ''}`, FeedResponseSchema)
