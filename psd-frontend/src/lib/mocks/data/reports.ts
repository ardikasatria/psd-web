import type { AdminContentReport, MyReport, ReportResponse } from '@/types/api'
import { REPORT_REASONS } from '@/types/api'

type ReportEntry = {
  reporter_id: string
  reason: string
  detail?: string
  created_at: string
}

type ReportRecord = {
  id: string
  kind: string
  target_id: string
  target_key: string
  report_count: number
  flagged: boolean
  status: 'pending' | 'reviewing' | 'resolved'
  decision: string | null
  preview: string
  created_at: string
  entries: ReportEntry[]
}

const REASONS = new Set<string>(REPORT_REASONS)
const AUTO_FLAG_THRESHOLD = 3

let nextReportSeq = 100

const reportStore: ReportRecord[] = [
  {
    id: 'rpt_flagged_01',
    kind: 'post',
    target_id: 'post_spam_demo',
    target_key: 'post:post_spam_demo',
    report_count: 4,
    flagged: true,
    status: 'pending',
    decision: null,
    preview: 'Beli follower murah! DM sekarang!!!',
    created_at: '2026-06-25T09:00:00Z',
    entries: [
      { reporter_id: 'usr_02', reason: 'spam', created_at: '2026-06-25T09:00:00Z' },
      { reporter_id: 'usr_03', reason: 'spam', created_at: '2026-06-25T09:05:00Z' },
      { reporter_id: 'usr_mod', reason: 'menyesatkan', created_at: '2026-06-25T09:10:00Z' },
      { reporter_id: 'usr_01', reason: 'spam', created_at: '2026-06-25T09:15:00Z' },
    ],
  },
  {
    id: 'rpt_review_01',
    kind: 'thread',
    target_id: 'thr_toxic_demo',
    target_key: 'thread:thr_toxic_demo',
    report_count: 2,
    flagged: false,
    status: 'reviewing',
    decision: null,
    preview: 'Thread berisi ujaran kebencian terhadap komunitas tertentu.',
    created_at: '2026-06-24T14:00:00Z',
    entries: [
      { reporter_id: 'usr_02', reason: 'kebencian', created_at: '2026-06-24T14:00:00Z' },
      { reporter_id: 'usr_01', reason: 'pelecehan', created_at: '2026-06-24T15:00:00Z' },
    ],
  },
  {
    id: 'rpt_resolved_01',
    kind: 'comment',
    target_id: 'cmt_old',
    target_key: 'comment:cmt_old',
    report_count: 1,
    flagged: false,
    status: 'resolved',
    decision: 'dismiss',
    preview: 'Komentar sudah ditinjau — tidak melanggar pedoman.',
    created_at: '2026-06-20T11:00:00Z',
    entries: [{ reporter_id: 'usr_02', reason: 'lainnya', created_at: '2026-06-20T11:00:00Z' }],
  },
]

function topReason(entries: ReportEntry[]): string | null {
  const counts: Record<string, number> = {}
  for (const e of entries) counts[e.reason] = (counts[e.reason] ?? 0) + 1
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] ?? null
}

function toAdmin(r: ReportRecord): AdminContentReport {
  return {
    id: r.id,
    kind: r.kind,
    target_id: r.target_id,
    target_key: r.target_key,
    report_count: r.report_count,
    flagged: r.flagged,
    status: r.status,
    decision: r.decision,
    top_reason: topReason(r.entries),
    preview: r.preview,
    created_at: r.created_at,
  }
}

const REPORT_TRANSITIONS: Record<string, { from: Set<string>; to: ReportRecord['status'] }> = {
  start_review: { from: new Set(['pending']), to: 'reviewing' },
  resolve: { from: new Set(['pending', 'reviewing']), to: 'resolved' },
  reopen: { from: new Set(['resolved']), to: 'reviewing' },
}

const DECISIONS = new Set(['dismiss', 'remove', 'warn', 'ban', 'lock'])

export function mockReportContent(
  userId: string,
  body: { kind?: string; target_id?: string; reason?: string; detail?: string },
): { data?: ReportResponse; error?: { status: number; code: string; message: string } } {
  const kind = (body.kind ?? '').trim()
  const targetId = (body.target_id ?? '').trim()
  const reason = (body.reason ?? '').trim()
  if (!['post', 'feed', 'comment', 'thread', 'reply'].includes(kind)) {
    return { error: { status: 422, code: 'not_reportable', message: `Jenis tak bisa dilaporkan: ${kind}` } }
  }
  if (!REASONS.has(reason)) {
    return { error: { status: 422, code: 'bad_reason', message: `Alasan tak dikenal: ${reason}` } }
  }
  const key = `${kind}:${targetId}`
  let report = reportStore.find((r) => r.target_key === key)
  if (!report) {
    report = {
      id: `rpt_${Date.now()}_${nextReportSeq++}`,
      kind,
      target_id: targetId,
      target_key: key,
      report_count: 0,
      flagged: false,
      status: 'pending',
      decision: null,
      preview: `[${kind}] ${targetId}`,
      created_at: new Date().toISOString(),
      entries: [],
    }
    reportStore.push(report)
  }
  const exists = report.entries.some((e) => e.reporter_id === userId)
  if (exists) {
    return { data: { status: report.status, already_reported: true, id: report.id } }
  }
  report.entries.push({
    reporter_id: userId,
    reason,
    detail: body.detail?.trim() || undefined,
    created_at: new Date().toISOString(),
  })
  report.report_count = report.entries.length
  if (report.report_count >= AUTO_FLAG_THRESHOLD) report.flagged = true
  return { data: { status: report.status, already_reported: false, id: report.id } }
}

export function mockMyReports(userId: string): MyReport[] {
  const out: MyReport[] = []
  for (const r of reportStore) {
    for (const e of r.entries) {
      if (e.reporter_id === userId) {
        out.push({
          id: r.id,
          kind: r.kind,
          target_id: r.target_id,
          reason: e.reason,
          status: r.status,
          created_at: e.created_at,
        })
      }
    }
  }
  return out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function mockAdminListReports(opts: { flagged?: boolean; status?: string }) {
  let items = reportStore.map(toAdmin)
  if (opts.flagged === true) items = items.filter((r) => r.flagged)
  items.sort((a, b) => {
    if (a.flagged !== b.flagged) return a.flagged ? -1 : 1
    if (a.report_count !== b.report_count) return b.report_count - a.report_count
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
  return items
}

export function mockAdminStartReview(reportId: string) {
  const r = reportStore.find((x) => x.id === reportId)
  if (!r) return { error: { status: 404, code: 'not_found', message: 'Laporan tidak ditemukan' } }
  const rule = REPORT_TRANSITIONS.start_review
  if (!rule.from.has(r.status)) {
    return {
      error: {
        status: 409,
        code: 'invalid_transition',
        message: `Tak bisa 'start_review' dari '${r.status}'.`,
      },
    }
  }
  r.status = rule.to
  return { data: { status: r.status } }
}

export function mockAdminResolveReport(reportId: string, decision: string) {
  const r = reportStore.find((x) => x.id === reportId)
  if (!r) return { error: { status: 404, code: 'not_found', message: 'Laporan tidak ditemukan' } }
  if (!DECISIONS.has(decision)) {
    return { error: { status: 422, code: 'bad_decision', message: `Keputusan tak dikenal: ${decision}` } }
  }
  const rule = REPORT_TRANSITIONS.resolve
  if (!rule.from.has(r.status)) {
    return {
      error: {
        status: 409,
        code: 'invalid_transition',
        message: `Tak bisa 'resolve' dari '${r.status}'.`,
      },
    }
  }
  r.status = rule.to
  r.decision = decision
  return { data: { status: r.status, decision } }
}

export function mockAdminReopenReport(reportId: string) {
  const r = reportStore.find((x) => x.id === reportId)
  if (!r) return { error: { status: 404, code: 'not_found', message: 'Laporan tidak ditemukan' } }
  const rule = REPORT_TRANSITIONS.reopen
  if (!rule.from.has(r.status)) {
    return {
      error: {
        status: 409,
        code: 'invalid_transition',
        message: `Tak bisa 'reopen' dari '${r.status}'.`,
      },
    }
  }
  r.status = rule.to
  r.decision = null
  return { data: { status: r.status } }
}
