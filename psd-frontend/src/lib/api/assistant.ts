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
    const e = body?.error ?? body
    const code = e?.code ?? e?.slug ?? 'assistant_error'
    const message =
      typeof body?.detail === 'string'
        ? body.detail
        : (e?.message ?? body?.message ?? res.statusText)
    throw new ApiError(res.status, code, message, e?.details ?? e)
  }
  return schema.parse(await res.json())
}

const QuotaSchema = z.object({
  tier: z.string().optional().default('pemula'),
  limit: z.number(),
  used: z.number(),
  remaining: z.number(),
})

const WindowQuotaSchema = z.object({
  can_send: z.boolean(),
  used: z.number(),
  remaining: z.number(),
  limit: z.number(),
  window_hours: z.number(),
  reset_at: z.string().nullable(),
})

export const AssistantPanelSchema = z.object({
  quota: WindowQuotaSchema,
  memory: z.object({
    max_context_messages: z.number(),
    max_history_conversations: z.number(),
  }),
  send_disabled: z.boolean(),
  warning: z.string().nullable(),
})

export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  updated_at: z.string(),
})

export const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
})

const AskResultSchema = z.object({
  reply: z.string(),
  quota: QuotaSchema,
})

const SendResultSchema = z.object({
  reply: z.string(),
  panel: AssistantPanelSchema.optional(),
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
export type AssistantPanel = z.infer<typeof AssistantPanelSchema>
export type AssistantConversation = z.infer<typeof ConversationSchema>
export type AssistantMessage = z.infer<typeof MessageSchema>
export type AskResult = z.infer<typeof AskResultSchema>
export type FeedSection = z.infer<typeof FeedSectionSchema>
export type PersonalizedFeed = z.infer<typeof FeedResponseSchema>

export const getAssistantPanel = () => assistantFetch('/api/assistant/panel', AssistantPanelSchema)

export const listConversations = () =>
  assistantFetch('/api/assistant/conversations', z.array(ConversationSchema))

export const newConversation = () =>
  assistantFetch('/api/assistant/conversations', ConversationSchema, { method: 'POST' })

export const getConversation = (id: string) =>
  assistantFetch(`/api/assistant/conversations/${id}`, z.object({
    id: z.string(),
    messages: z.array(MessageSchema),
  }))

export const sendMessage = (id: string, content: string, context?: Record<string, string>) =>
  assistantFetch(`/api/assistant/conversations/${id}/messages`, SendResultSchema, {
    method: 'POST',
    body: JSON.stringify({ content, context }),
  })

export const deleteConversation = (id: string) =>
  assistantFetch(`/api/assistant/conversations/${id}`, z.object({ ok: z.boolean().optional() }), {
    method: 'DELETE',
  })

/** @deprecated gunakan sendMessage + conversations */
export const askAssistant = (body: { question: string; context?: Record<string, string> }) =>
  assistantFetch('/api/assistant/ask', AskResultSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

/** @deprecated gunakan getAssistantPanel */
export const getAssistantQuota = () => assistantFetch('/api/assistant/quota', QuotaSchema)

export const getPersonalizedFeed = (kinds?: string) =>
  assistantFetch(`/api/feed${kinds ? `?kinds=${encodeURIComponent(kinds)}` : ''}`, FeedResponseSchema)
