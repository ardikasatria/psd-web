import type { EventProposal } from '@/types/api'

export const mockEventProposals: EventProposal[] = [
  {
    id: 'evtp_demo_pending',
    proposed_slug: 'workshop-ml-umkm',
    title: 'Workshop ML untuk UMKM Lampung',
    type: 'bootcamp',
    mode: 'luring',
    starts_at: '2026-08-15T08:00:00Z',
    ends_at: '2026-08-15T17:00:00Z',
    location: 'Co-working Bandar Lampung',
    cover_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=400&fit=crop',
    gallery_urls: [
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=450&fit=crop',
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=450&fit=crop',
    ],
    capacity: 40,
    description_md: 'Bootcamp satu hari untuk UMKM yang ingin mempelajari dasar machine learning.',
    agenda: [],
    speakers: [],
    category: { slug: 'umkm', name: 'UMKM & Ekonomi' },
    subcategory: null,
    status: 'pending_review',
    review_note: null,
    event_slug: null,
    created_at: '2026-06-22T10:00:00Z',
    updated_at: '2026-06-22T10:00:00Z',
    submitted_at: '2026-06-22T10:00:00Z',
    user: { username: 'budi-santoso', name: 'Budi Santoso' },
  },
]

export function paginateEventProposals(items: EventProposal[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(items.length / pageSize)),
  }
}
