import type { AssistantPanel, AssistantConversation, AssistantMessage } from '@/lib/api/assistant'

const TIER_LIMITS: Record<string, [number, number]> = {
  pemula: [10, 5],
  menengah: [50, 5],
  lanjut: [200, 5],
}

const MEMORY_LIMITS: Record<string, [number, number]> = {
  pemula: [10, 5],
  menengah: [20, 20],
  lanjut: [40, 100],
}

type WindowState = { window_start: number | null; count: number }

const windows = new Map<string, WindowState>()
const conversations = new Map<string, AssistantConversation[]>()
const messages = new Map<string, AssistantMessage[]>()
let convSeq = 1

function tierOf() {
  return 'menengah'
}

function limitsFor(tier: string) {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.pemula
}

function memoryFor(tier: string) {
  return MEMORY_LIMITS[tier] ?? MEMORY_LIMITS.pemula
}

function viewQuota(userId: string, tier = tierOf()) {
  const [limit, hours] = limitsFor(tier)
  const state = windows.get(userId) ?? { window_start: null, count: 0 }
  const now = Date.now()
  const windowMs = hours * 3600 * 1000

  if (state.window_start === null || now >= state.window_start + windowMs) {
    return {
      can_send: limit > 0,
      used: 0,
      remaining: limit,
      limit,
      window_hours: hours,
      reset_at: null as string | null,
    }
  }

  const reset_at = new Date(state.window_start + windowMs).toISOString()
  const remaining = Math.max(0, limit - state.count)
  return {
    can_send: remaining > 0,
    used: state.count,
    remaining,
    limit,
    window_hours: hours,
    reset_at,
  }
}

function consumeQuota(userId: string, tier = tierOf()) {
  const [limit, hours] = limitsFor(tier)
  const now = Date.now()
  const windowMs = hours * 3600 * 1000
  let state = windows.get(userId) ?? { window_start: null, count: 0 }

  if (state.window_start === null || now >= state.window_start + windowMs) {
    state = { window_start: now, count: 0 }
  }

  const reset_at = new Date(state.window_start! + windowMs).toISOString()
  if (state.count >= limit) {
    windows.set(userId, state)
    return {
      ok: false as const,
      quota: {
        can_send: false,
        used: state.count,
        remaining: 0,
        limit,
        window_hours: hours,
        reset_at,
      },
    }
  }

  state = { window_start: state.window_start, count: state.count + 1 }
  windows.set(userId, state)
  const remaining = limit - state.count
  return {
    ok: true as const,
    quota: {
      can_send: remaining > 0,
      used: state.count,
      remaining,
      limit,
      window_hours: hours,
      reset_at,
    },
  }
}

function fmtReset(resetAt: string | null) {
  if (!resetAt) return null
  const secs = Math.max(0, Math.floor((new Date(resetAt).getTime() - Date.now()) / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h} jam ${m} menit`
  return `${m} menit`
}

function pruneHistory(userId: string) {
  const tier = tierOf()
  const [, maxConv] = memoryFor(tier)
  const list = conversations.get(userId) ?? []
  if (list.length <= maxConv) return
  const sorted = [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const keep = new Set(sorted.slice(0, maxConv).map((c) => c.id))
  const pruned = sorted.filter((c) => keep.has(c.id))
  conversations.set(userId, pruned)
  for (const key of [...messages.keys()]) {
    if (!keep.has(key)) messages.delete(key)
  }
}

function userConvs(userId: string) {
  if (!conversations.has(userId)) conversations.set(userId, [])
  return conversations.get(userId)!
}

export function mockAssistantPanel(userId: string): AssistantPanel {
  const tier = tierOf()
  const q = viewQuota(userId, tier)
  const [ctxMax, histMax] = memoryFor(tier)
  let warning: string | null = null
  if (!q.can_send) {
    const inText = fmtReset(q.reset_at)
    warning =
      'Kuota chat Anda habis.' +
      (inText ? ` Kuota pulih dalam ${inText}.` : '') +
      ' Tingkatkan tier untuk kuota lebih besar.'
  }
  return {
    quota: q,
    memory: { max_context_messages: ctxMax, max_history_conversations: histMax },
    send_disabled: !q.can_send,
    warning,
  }
}

export function mockListConversations(userId: string): AssistantConversation[] {
  return [...userConvs(userId)].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function mockNewConversation(userId: string): AssistantConversation {
  const now = new Date().toISOString()
  const conv: AssistantConversation = {
    id: `ac_mock_${convSeq++}`,
    title: 'Chat baru',
    updated_at: now,
  }
  userConvs(userId).unshift(conv)
  messages.set(conv.id, [])
  pruneHistory(userId)
  return conv
}

export function mockGetConversation(userId: string, id: string) {
  const conv = userConvs(userId).find((c) => c.id === id)
  if (!conv) throw new Error('not_found')
  return { id: conv.id, messages: messages.get(id) ?? [] }
}

export function mockDeleteConversation(userId: string, id: string) {
  const list = userConvs(userId)
  const idx = list.findIndex((c) => c.id === id)
  if (idx === -1) throw new Error('not_found')
  list.splice(idx, 1)
  messages.delete(id)
}

export function mockSendMessage(
  userId: string,
  convId: string,
  content: string,
  context?: Record<string, string> | null,
) {
  const conv = userConvs(userId).find((c) => c.id === convId)
  if (!conv) throw new Error('not_found')

  const consumed = consumeQuota(userId)
  if (!consumed.ok) {
    const err = new Error('quota_exhausted') as Error & { reset_at?: string; status?: number }
    err.status = 429
    err.reset_at = consumed.quota.reset_at ?? undefined
    throw err
  }

  const thread = messages.get(convId) ?? []
  thread.push({ role: 'user', content })
  const fitur = context?.fitur ?? 'platform PSD'
  const reply =
    `[Mock] Pertanyaan Anda tentang "${content.slice(0, 80)}" ` +
    `(konteks: ${fitur}) — buka dokumentasi di /help atau jelajahi fitur terkait di navigasi.`
  thread.push({ role: 'assistant', content: reply })
  messages.set(convId, thread)

  if (conv.title === 'Chat baru') {
    conv.title = content.slice(0, 48) + (content.length > 48 ? '…' : '')
  }
  conv.updated_at = new Date().toISOString()

  return { reply, panel: mockAssistantPanel(userId) }
}

/** Legacy — tetap untuk handler lama bila masih dipakai. */
export function mockAssistantQuota() {
  const q = viewQuota('legacy')
  return { tier: tierOf(), limit: q.limit, used: q.used, remaining: q.remaining }
}

export function mockAssistantAsk(question: string, context?: Record<string, string> | null) {
  const userId = 'legacy'
  const consumed = consumeQuota(userId)
  if (!consumed.ok) throw new Error('quota_exhausted')
  const fitur = context?.fitur ?? 'platform PSD'
  const reply =
    `[Mock] Pertanyaan Anda tentang "${question.slice(0, 80)}" ` +
    `(konteks: ${fitur}) — buka dokumentasi di /help atau jelajahi fitur terkait di navigasi.`
  const q = viewQuota(userId)
  return { reply, quota: { tier: tierOf(), ...q } }
}

export function mockPersonalizedFeed() {
  return {
    strategy: 'affinity' as const,
    feed: [
      {
        type: 'next_steps' as const,
        title: 'Langkah berikutnya',
        items: [
          { action: 'publish_dataset', text: 'Publikasikan dataset pertama Anda', href: '/datasets/new' },
          { action: 'join_competition', text: 'Ikuti kompetisi aktif', href: '/competitions' },
        ],
      },
    ],
  }
}

export function resetMockAssistantQuota() {
  windows.clear()
}
