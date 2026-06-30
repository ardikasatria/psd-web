import {
  Ticket,
  TicketDetail,
  TicketDetailSchema,
  TicketSchema,
} from '@/types/api'
import { apiFetch } from './client'
import { z } from 'zod'

export const TICKET_CATEGORIES = [
  { id: 'bug', label: 'Bug' },
  { id: 'error', label: 'Error' },
  { id: 'akun', label: 'Akun' },
  { id: 'data', label: 'Data' },
  { id: 'fitur', label: 'Fitur' },
  { id: 'lainnya', label: 'Lainnya' },
] as const

export const TICKET_PRIORITIES = [
  { id: 'rendah', label: 'Rendah' },
  { id: 'sedang', label: 'Sedang' },
  { id: 'tinggi', label: 'Tinggi' },
  { id: 'kritis', label: 'Kritis' },
] as const

export const createTicket = (body: {
  category: string
  priority: string
  subject: string
  body: string
}) =>
  apiFetch<Ticket>('/support/tickets', TicketSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const myTickets = () =>
  apiFetch<Ticket[]>('/support/tickets/me', z.array(TicketSchema))

export const getTicket = (id: string) =>
  apiFetch<TicketDetail>(`/support/tickets/${id}`, TicketDetailSchema)

export const replyTicket = (id: string, body: string) =>
  apiFetch(`/support/tickets/${id}/messages`, z.object({ id: z.number() }), {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
