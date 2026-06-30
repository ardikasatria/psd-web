import {
  AdminContentReport,
  MyReport,
  MyReportSchema,
  PaginatedAdminContentReport,
  PaginatedAdminContentReportSchema,
  PaginatedAdminTicket,
  PaginatedAdminTicketSchema,
  ReportableKind,
  ReportResponse,
  ReportResponseSchema,
  Ticket,
  TicketSchema,
} from '@/types/api'
import { apiFetch, buildQuery } from './client'
import { z } from 'zod'

export const reportContent = (body: {
  kind: ReportableKind
  target_id: string
  reason: string
  detail?: string
}) =>
  apiFetch<ReportResponse>('/reports', ReportResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const myReports = () => apiFetch<MyReport[]>('/reports/me', z.array(MyReportSchema))

export const adminListReports = (q: {
  flagged?: boolean
  status?: string
  page?: number
  page_size?: number
} = {}) =>
  apiFetch<PaginatedAdminContentReport>(
    `/admin/reports${buildQuery(q)}`,
    PaginatedAdminContentReportSchema,
  )

export const adminStartReportReview = (id: string) =>
  apiFetch(`/admin/reports/${id}/start-review`, z.object({ status: z.string() }), {
    method: 'POST',
  })

export const adminResolveReport = (id: string, decision: string) =>
  apiFetch(`/admin/reports/${id}/resolve`, z.object({ status: z.string(), decision: z.string() }), {
    method: 'POST',
    body: JSON.stringify({ decision }),
  })

export const adminReopenReport = (id: string) =>
  apiFetch(`/admin/reports/${id}/reopen`, z.object({ status: z.string() }), { method: 'POST' })

export const adminListTickets = (q: {
  status?: string
  priority?: string
  page?: number
  page_size?: number
} = {}) =>
  apiFetch<PaginatedAdminTicket>(
    `/admin/support/tickets${buildQuery(q)}`,
    PaginatedAdminTicketSchema,
  )

export const adminTicketAction = (
  id: string,
  action: 'assign' | 'resolve' | 'close' | 'reopen',
) =>
  apiFetch(`/admin/support/tickets/${id}/${action}`, z.object({ ok: z.boolean() }), {
    method: 'POST',
  })

export const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  pelecehan: 'Pelecehan',
  kebencian: 'Ujaran kebencian',
  seksual: 'Konten seksual',
  kekerasan: 'Kekerasan',
  misinformasi: 'Misinformasi',
  menyesatkan: 'Menyesatkan',
  ilegal: 'Ilegal',
  lainnya: 'Lainnya',
}

export const DECISION_LABELS: Record<string, string> = {
  dismiss: 'Abaikan',
  remove: 'Hapus konten',
  lock: 'Kunci thread',
  warn: 'Peringatkan penulis',
  ban: 'Blokir penulis',
}

export const TICKET_STATUS_LABELS: Record<string, string> = {
  open: 'Terbuka',
  in_progress: 'Diproses',
  resolved: 'Selesai',
  closed: 'Ditutup',
}

export const REPORT_STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  reviewing: 'Ditinjau',
  resolved: 'Selesai',
}
