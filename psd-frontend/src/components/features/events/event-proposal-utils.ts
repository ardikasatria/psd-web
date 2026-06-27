import type { EventProposalStatus } from '@/types/api'

export const eventProposalStatusLabel: Record<EventProposalStatus, string> = {
  draft: 'Draf',
  pending_review: 'Menunggu tinjauan humas',
  revision_requested: 'Perlu revisi',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

export const eventProposalStatusColor: Record<
  EventProposalStatus,
  'green' | 'yellow' | 'red' | 'zinc' | 'blue'
> = {
  draft: 'zinc',
  pending_review: 'yellow',
  revision_requested: 'blue',
  approved: 'green',
  rejected: 'red',
}

export function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export type EventProposalFormState = {
  proposed_slug: string
  title: string
  type: string
  mode: string
  starts_at: string
  ends_at: string
  location: string
  capacity: string
  description_md: string
  cover_url: string | null
  gallery_urls: string[]
}

export const emptyEventProposalForm = (): EventProposalFormState => ({
  proposed_slug: '',
  title: '',
  type: 'webinar',
  mode: 'daring',
  starts_at: '',
  ends_at: '',
  location: '',
  capacity: '',
  description_md: '',
  cover_url: null,
  gallery_urls: [],
})

export function eventProposalFormToBody(
  form: EventProposalFormState,
  categorySlug: string | null,
  subcategorySlug: string | null,
  submit: boolean,
) {
  return {
    proposed_slug: form.proposed_slug.trim(),
    title: form.title.trim(),
    type: form.type,
    mode: form.mode,
    starts_at: form.starts_at,
    ends_at: form.ends_at,
    location: form.location.trim() || null,
    capacity: form.capacity ? Number(form.capacity) : null,
    cover_url: form.cover_url,
    gallery_urls: form.gallery_urls,
    description_md: form.description_md,
    agenda: [],
    speakers: [],
    category: categorySlug,
    subcategory: subcategorySlug,
    submit,
  }
}

export function toDatetimeLocal(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
