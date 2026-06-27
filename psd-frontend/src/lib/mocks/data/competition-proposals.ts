import type { CompetitionProposal } from '@/types/api'

export const mockCompetitionProposals: CompetitionProposal[] = [
  {
    id: 'cmpp_demo_pending',
    proposed_slug: 'klasifikasi-produk-umkm',
    title: 'Klasifikasi Produk UMKM dari Foto',
    sponsor: 'Koperasi Digital Lampung',
    metric: 'Accuracy',
    prize_pool: 'Rp5.000.000',
    starts_at: '2026-08-01T00:00:00Z',
    ends_at: '2026-09-01T23:59:00Z',
    cover_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=400&fit=crop',
    overview_md: 'Kompetisi untuk mengklasifikasikan produk UMKM berdasarkan foto produk.',
    rules_md: 'Tim maksimal 3 orang. Submission harian maksimal 5.',
    dataset_info_md: 'Dataset berisi 5.000 foto produk dengan label kategori.',
    daily_submission_limit: 5,
    category: { slug: 'computer-vision', name: 'Computer Vision' },
    subcategory: null,
    status: 'pending_review',
    review_note: null,
    competition_slug: null,
    created_at: '2026-06-20T10:00:00Z',
    updated_at: '2026-06-20T10:00:00Z',
    submitted_at: '2026-06-20T10:00:00Z',
    user: { username: 'budi-santoso', name: 'Budi Santoso' },
  },
]

export function paginateProposals(items: CompetitionProposal[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(items.length / pageSize)),
  }
}
