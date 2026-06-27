import type { CompetitionProposalStatus } from '@/types/api'

export const proposalStatusLabel: Record<CompetitionProposalStatus, string> = {
  draft: 'Draf',
  pending_review: 'Menunggu tinjauan humas',
  revision_requested: 'Perlu revisi',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

export const proposalStatusColor: Record<
  CompetitionProposalStatus,
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

export type ProposalFormState = {
  proposed_slug: string
  title: string
  sponsor: string
  metric: string
  prize_pool: string
  starts_at: string
  ends_at: string
  overview_md: string
  rules_md: string
  dataset_info_md: string
  daily_submission_limit: string
  cover_url: string | null
}

export const emptyProposalForm = (): ProposalFormState => ({
  proposed_slug: '',
  title: '',
  sponsor: '',
  metric: 'Accuracy',
  prize_pool: '',
  starts_at: '',
  ends_at: '',
  overview_md: '',
  rules_md: '',
  dataset_info_md: '',
  daily_submission_limit: '5',
  cover_url: null,
})

export function proposalFormToBody(
  form: ProposalFormState,
  categorySlug: string | null,
  subcategorySlug: string | null,
  submit: boolean,
) {
  return {
    proposed_slug: form.proposed_slug.trim(),
    title: form.title.trim(),
    sponsor: form.sponsor.trim() || null,
    metric: form.metric.trim() || 'Accuracy',
    prize_pool: form.prize_pool.trim() || null,
    starts_at: form.starts_at,
    ends_at: form.ends_at,
    cover_url: form.cover_url,
    overview_md: form.overview_md,
    rules_md: form.rules_md,
    dataset_info_md: form.dataset_info_md,
    daily_submission_limit: Number(form.daily_submission_limit) || 5,
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
