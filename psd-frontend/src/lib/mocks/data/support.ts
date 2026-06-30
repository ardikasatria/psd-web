import { owners, users } from './users'
import type { AdminTicket, Ticket, TicketDetail, TicketMessage } from '@/types/api'

type TicketRecord = TicketDetail & {
  user_id: string
  assignee_id?: string | null
}

const staffRef = { username: 'admin-psd', name: 'Admin PSD', type: 'user' as const, avatar_url: null }

let nextMsgId = 100
let nextTicketSeq = 10

const ticketStore: TicketRecord[] = [
  {
    id: 'tkt_demo_open',
    user_id: 'usr_psd',
    category: 'bug',
    priority: 'sedang',
    subject: 'Tombol simpan notebook tidak merespons',
    body: 'Saat menekan Simpan di notebook, loading terus tanpa error di konsol.',
    status: 'open',
    created_at: '2026-06-20T08:00:00Z',
    updated_at: '2026-06-20T08:00:00Z',
    assignee: null,
    messages: [],
  },
  {
    id: 'tkt_demo_progress',
    user_id: 'usr_01',
    category: 'akun',
    priority: 'tinggi',
    subject: 'Tidak bisa verifikasi email',
    body: 'Link verifikasi dari email selalu expired meski baru dikirim.',
    status: 'in_progress',
    created_at: '2026-06-18T10:30:00Z',
    updated_at: '2026-06-19T14:00:00Z',
    assignee: staffRef,
    messages: [
      {
        id: 1,
        author: staffRef,
        body: 'Tim sedang mengecek log email. Mohon tunggu 1×24 jam.',
        is_staff: true,
        created_at: '2026-06-19T14:00:00Z',
      },
    ],
  },
]

function ticketSummary(t: TicketRecord): Ticket {
  return {
    id: t.id,
    category: t.category,
    priority: t.priority,
    subject: t.subject,
    status: t.status,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }
}

function ticketDetail(t: TicketRecord): TicketDetail {
  return {
    ...ticketSummary(t),
    body: t.body,
    assignee: t.assignee ?? null,
    messages: t.messages,
  }
}

const PRIORITIES = new Set(['rendah', 'sedang', 'tinggi', 'kritis'])
const CATEGORIES = new Set(['bug', 'error', 'akun', 'data', 'fitur', 'lainnya'])

const TICKET_TRANSITIONS: Record<string, { from: Set<string>; to: string }> = {
  assign: { from: new Set(['open', 'in_progress']), to: 'in_progress' },
  resolve: { from: new Set(['open', 'in_progress']), to: 'resolved' },
  close: { from: new Set(['open', 'in_progress', 'resolved']), to: 'closed' },
  reopen: { from: new Set(['resolved', 'closed']), to: 'in_progress' },
}

export function mockMyTickets(userId: string) {
  return ticketStore.filter((t) => t.user_id === userId).map(ticketSummary)
}

export function mockGetTicket(ticketId: string, userId: string, isStaff: boolean) {
  const t = ticketStore.find((x) => x.id === ticketId)
  if (!t) return { error: { status: 404, code: 'not_found', message: 'Tiket tidak ditemukan' } }
  if (t.user_id !== userId && !isStaff) {
    return { error: { status: 403, code: 'forbidden', message: 'Tidak diizinkan' } }
  }
  return { data: ticketDetail(t) }
}

export function mockCreateTicket(
  userId: string,
  body: { category?: string; priority?: string; subject?: string; body?: string },
) {
  const category = (body.category ?? '').trim()
  const priority = (body.priority ?? 'sedang').trim()
  if (!CATEGORIES.has(category)) {
    return { error: { status: 422, code: 'bad_category', message: `Kategori tak dikenal: ${category}` } }
  }
  if (!PRIORITIES.has(priority)) {
    return { error: { status: 422, code: 'bad_priority', message: `Prioritas tak dikenal: ${priority}` } }
  }
  const subject = (body.subject ?? '').trim()
  const text = (body.body ?? '').trim()
  if (!subject || !text) {
    return { error: { status: 400, code: 'bad_request', message: 'Subjek dan deskripsi wajib diisi' } }
  }
  const now = new Date().toISOString()
  const t: TicketRecord = {
    id: `tkt_${Date.now()}_${nextTicketSeq++}`,
    user_id: userId,
    category,
    priority,
    subject,
    body: text,
    status: 'open',
    created_at: now,
    updated_at: now,
    assignee: null,
    messages: [],
  }
  ticketStore.unshift(t)
  return { data: ticketSummary(t) }
}

export function mockReplyTicket(
  ticketId: string,
  userId: string,
  username: string,
  text: string,
  isStaff: boolean,
) {
  const t = ticketStore.find((x) => x.id === ticketId)
  if (!t) return { error: { status: 404, code: 'not_found', message: 'Tiket tidak ditemukan' } }
  if (t.user_id !== userId && !isStaff) {
    return { error: { status: 403, code: 'forbidden', message: 'Tidak diizinkan' } }
  }
  const body = text.trim()
  if (!body) return { error: { status: 400, code: 'bad_request', message: 'Pesan tidak boleh kosong' } }
  if (t.status === 'closed' && !isStaff) {
    return { error: { status: 409, code: 'closed', message: 'Tiket sudah ditutup' } }
  }
  const msg: TicketMessage = {
    id: nextMsgId++,
    author: isStaff ? staffRef : { username, name: username, type: 'user', avatar_url: null },
    body,
    is_staff: isStaff,
    created_at: new Date().toISOString(),
  }
  t.messages.push(msg)
  t.updated_at = msg.created_at
  return { data: { id: msg.id } }
}

export function mockAdminListTickets() {
  const priorityOrder: Record<string, number> = { kritis: 0, tinggi: 1, sedang: 2, rendah: 3 }
  const items = [...ticketStore]
    .sort((a, b) => {
      const pd = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
      if (pd !== 0) return pd
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    .map((t): AdminTicket => {
      const u = users.find((x) => x.id === t.user_id)
      const userRef = u
        ? { username: u.username, name: u.name, type: 'user' as const, avatar_url: u.avatar_url }
        : owners.budi
      return {
        ...ticketSummary(t),
        user: userRef,
        assignee: t.assignee ?? null,
      }
    })
  return items
}

export function mockAdminTicketAction(ticketId: string, action: string) {
  const t = ticketStore.find((x) => x.id === ticketId)
  if (!t) return { error: { status: 404, code: 'not_found', message: 'Tiket tidak ditemukan' } }
  const rule = TICKET_TRANSITIONS[action]
  if (!rule || !rule.from.has(t.status)) {
    return {
      error: {
        status: 409,
        code: 'invalid_transition',
        message: `Tak bisa '${action}' dari '${t.status}'.`,
      },
    }
  }
  t.status = rule.to as Ticket['status']
  t.updated_at = new Date().toISOString()
  if (action === 'assign') t.assignee = staffRef
  return { data: { ok: true } }
}
