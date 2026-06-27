const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
const PREFIX = '/api/v1'
const FLUSH_MS = 10_000
const BATCH_SIZE = 50

export type TrackEvent = {
  action: string
  entity_type?: string
  entity_id?: string
  category_id?: string
  meta?: Record<string, unknown>
}

let queue: TrackEvent[] = []
let enabled = true
let flushTimer: ReturnType<typeof setInterval> | null = null

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let s = sessionStorage.getItem('psd_sid')
  if (!s) {
    s = crypto.randomUUID()
    sessionStorage.setItem('psd_sid', s)
  }
  return s
}

function saveDataPreferred(): boolean {
  if (typeof navigator === 'undefined') return false
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return conn?.saveData === true
}

export function setTrackingEnabled(v: boolean) {
  enabled = v
  if (!v) queue = []
}

export function track(ev: TrackEvent) {
  if (!enabled || typeof window === 'undefined') return
  if (saveDataPreferred()) return
  queue.push(ev)
}

export async function flushTracking() {
  if (!enabled || queue.length === 0 || typeof window === 'undefined') return
  const events = queue.splice(0, BATCH_SIZE)
  try {
    await fetch(`${BASE}${PREFIX}/track`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: getSessionId(), events }),
      keepalive: true,
    })
  } catch {
    /* abaikan; jangan ganggu UX */
  }
}

export function initTracking() {
  if (typeof window === 'undefined' || flushTimer) return
  flushTimer = setInterval(() => {
    void flushTracking()
  }, FLUSH_MS)
  window.addEventListener('beforeunload', () => {
    void flushTracking()
  })
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushTracking()
  })
}

export function trackPageView(path: string) {
  track({ action: 'view', entity_type: 'page', meta: { path } })
}

export function trackSearch(query: string) {
  const q = query.trim()
  if (!q) return
  track({ action: 'search', entity_type: 'search', meta: { query: q } })
}

export function trackClick(
  entity_type: string,
  entity_id: string,
  opts?: { category_slug?: string; tags?: string[] },
) {
  track({
    action: 'click',
    entity_type,
    entity_id,
    meta: {
      ...(opts?.category_slug ? { category_slug: opts.category_slug } : {}),
      ...(opts?.tags?.length ? { tags: opts.tags } : {}),
    },
  })
}

export function trackAssetView(
  entity_type: string,
  entity_id: string,
  opts?: { category_slug?: string; tags?: string[]; kind?: string },
) {
  track({
    action: 'view',
    entity_type,
    entity_id,
    meta: {
      ...(opts?.category_slug ? { category_slug: opts.category_slug } : {}),
      ...(opts?.tags?.length ? { tags: opts.tags } : {}),
      ...(opts?.kind ? { kind: opts.kind } : {}),
    },
  })
}
