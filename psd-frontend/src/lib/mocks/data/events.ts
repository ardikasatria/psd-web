import type { EventDetail, EventStats, EventSummary } from '@/types/api'

export type MockRegistration = {
  id: string
  eventSlug: string
  userId: string
  status: 'registered' | 'waitlisted'
  attended: boolean
  createdAt: string
}

/** In-memory registrations for mock mode */
export const eventRegistrations: MockRegistration[] = [
  {
    id: 'reg_1',
    eventSlug: 'demo-day-sains-data-itera',
    userId: 'usr_01',
    status: 'registered',
    attended: false,
    createdAt: '2026-06-01T00:00:00Z',
  },
]

export const events: EventSummary[] = [
  {
    slug: 'demo-day-sains-data-itera',
    title: 'Demo Day Sains Data ITERA',
    type: 'demo_day',
    mode: 'luring',
    status: 'upcoming',
    starts_at: '2026-07-10T08:00:00Z',
    ends_at: '2026-07-10T17:00:00Z',
    location: 'Gedung Auditorium ITERA, Lampung Selatan',
    cover_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=400&fit=crop',
    gallery_urls: [
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=450&fit=crop',
    ],
    registered: 145,
    capacity: 200,
    featured: true,
  },
  {
    slug: 'webinar-nlp-bahasa-indonesia',
    title: 'Webinar: NLP untuk Bahasa Indonesia',
    type: 'webinar',
    mode: 'daring',
    status: 'upcoming',
    starts_at: '2026-07-05T13:00:00Z',
    ends_at: '2026-07-05T15:00:00Z',
    location: null,
    cover_url: null,
    registered: 312,
    capacity: 500,
    featured: true,
  },
  {
    slug: 'hackathon-umkm-digital',
    title: 'Hackathon UMKM Digital Lampung',
    type: 'hackathon',
    mode: 'luring',
    status: 'upcoming',
    starts_at: '2026-08-15T08:00:00Z',
    ends_at: '2026-08-17T18:00:00Z',
    location: 'Co-working Space Bandar Lampung',
    cover_url: null,
    registered: 48,
    capacity: 60,
  },
  {
    slug: 'bootcamp-analisis-big-data',
    title: 'Bootcamp Analisis Big Data',
    type: 'bootcamp',
    mode: 'daring',
    status: 'upcoming',
    starts_at: '2026-07-20T01:00:00Z',
    ends_at: '2026-08-20T10:00:00Z',
    location: null,
    cover_url: null,
    registered: 89,
    capacity: 100,
  },
  {
    slug: 'meetup-komunitas-psd-lampung',
    title: 'Meetup Komunitas PSD Lampung',
    type: 'meetup',
    mode: 'luring',
    status: 'upcoming',
    starts_at: '2026-06-28T14:00:00Z',
    ends_at: '2026-06-28T17:00:00Z',
    location: 'Kafe Kopi Nusantara, Bandar Lampung',
    cover_url: null,
    registered: 35,
    capacity: 40,
  },
  {
    slug: 'webinar-computer-vision-pertanian',
    title: 'Webinar: Computer Vision untuk Pertanian',
    type: 'webinar',
    mode: 'daring',
    status: 'upcoming',
    starts_at: '2026-07-12T10:00:00Z',
    ends_at: '2026-07-12T12:00:00Z',
    location: null,
    cover_url: null,
    registered: 178,
    capacity: null,
  },
  {
    slug: 'demo-day-umkm-nasional',
    title: 'Demo Day UMKM Nasional',
    type: 'demo_day',
    mode: 'daring',
    status: 'upcoming',
    starts_at: '2026-09-01T08:00:00Z',
    ends_at: '2026-09-01T16:00:00Z',
    location: null,
    cover_url: null,
    registered: 0,
    capacity: 1000,
  },
  {
    slug: 'bootcamp-forecasting-umkm',
    title: 'Bootcamp Forecasting untuk UMKM',
    type: 'bootcamp',
    mode: 'daring',
    status: 'upcoming',
    starts_at: '2026-08-01T01:00:00Z',
    ends_at: '2026-08-31T10:00:00Z',
    location: null,
    cover_url: null,
    registered: 22,
    capacity: 50,
  },
  {
    slug: 'webinar-data-governance-2025',
    title: 'Webinar: Data Governance untuk UMKM',
    type: 'webinar',
    mode: 'daring',
    status: 'past',
    starts_at: '2025-11-10T10:00:00Z',
    ends_at: '2025-11-10T12:00:00Z',
    location: null,
    cover_url: null,
    registered: 95,
    capacity: 100,
  },
]

function registeredCount(slug: string) {
  return eventRegistrations.filter((r) => r.eventSlug === slug && r.status === 'registered').length
}

export function detailOf(e: EventSummary, userId?: string | null): EventDetail {
  const registered = registeredCount(e.slug) || e.registered
  const spotsLeft = e.capacity != null ? Math.max(0, e.capacity - registered) : null
  const mine = userId
    ? eventRegistrations.find((r) => r.eventSlug === e.slug && r.userId === userId)
    : undefined

  const base: EventDetail = {
    ...e,
    gallery_urls: e.gallery_urls ?? [],
    registered,
    spots_left: spotsLeft,
    my_registration: mine ? { status: mine.status } : null,
    description_md: '',
    agenda: [],
    speakers: [],
  }

  if (e.slug === 'demo-day-sains-data-itera') {
    return {
      ...base,
      description_md:
        'Acara showcase proyek sains data mahasiswa dan komunitas ITERA. 15 tim akan mempresentasikan solusi data untuk UMKM dan pertanian lokal.',
      agenda: [
        { time: '08:00', title: 'Registrasi & networking' },
        { time: '09:00', title: 'Pembukaan & keynote' },
        { time: '10:00', title: 'Presentasi tim (batch 1)' },
        { time: '13:00', title: 'Presentasi tim (batch 2)' },
        { time: '15:30', title: 'Penghargaan & penutupan' },
      ],
      speakers: [
        { name: 'Dr. Ahmad Fauzi', title: 'Kepala Lab Sains Data ITERA', avatar_url: null },
        { name: 'Budi Santoso', title: 'Data Scientist, PSD Community', avatar_url: null },
      ],
    }
  }
  return {
    ...base,
    description_md: `${e.title} — event ${e.type.replace('_', ' ')} mode ${e.mode}.`,
    agenda: [
      { time: '09:00', title: 'Pembukaan' },
      { time: '10:00', title: 'Sesi utama' },
      { time: '14:00', title: 'Diskusi & penutupan' },
    ],
    speakers: [{ name: 'Tim PSD', title: 'Penyelenggara', avatar_url: null }],
  }
}

export function buildMockIcs(e: EventSummary): string {
  const fmt = (s: string) => s.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const loc = e.location ?? (e.mode === 'daring' ? 'Daring' : '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PSD//Event//ID',
    'BEGIN:VEVENT',
    `UID:${e.slug}@psd.id`,
    `DTSTART:${fmt(e.starts_at)}`,
    `DTEND:${fmt(e.ends_at)}`,
    `SUMMARY:${e.title}`,
    `LOCATION:${loc}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export type EventListFilters = {
  status?: string
  type?: string
  sort?: 'date' | 'title_asc' | 'title_desc'
  year?: number
  from_date?: string
  to_date?: string
}

function withRegistered(items: EventSummary[]) {
  return items.map((e) => ({
    ...e,
    registered:
      eventRegistrations.filter((r) => r.eventSlug === e.slug && r.status === 'registered').length ||
      e.registered,
  }))
}

export function filterEvents(items: EventSummary[], f: EventListFilters): EventSummary[] {
  let out = withRegistered([...items])
  if (f.status) out = out.filter((e) => e.status === f.status)
  if (f.type) out = out.filter((e) => e.type === f.type)
  if (f.year) out = out.filter((e) => new Date(e.starts_at).getUTCFullYear() === f.year)
  if (f.from_date) {
    const from = new Date(`${f.from_date}T00:00:00Z`).getTime()
    out = out.filter((e) => new Date(e.starts_at).getTime() >= from)
  }
  if (f.to_date) {
    const to = new Date(`${f.to_date}T23:59:59Z`).getTime()
    out = out.filter((e) => new Date(e.starts_at).getTime() <= to)
  }
  if (f.sort === 'title_asc') {
    out.sort((a, b) => a.title.localeCompare(b.title, 'id') || a.starts_at.localeCompare(b.starts_at))
  } else if (f.sort === 'title_desc') {
    out.sort((a, b) => b.title.localeCompare(a.title, 'id') || a.starts_at.localeCompare(b.starts_at))
  } else {
    out.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  }
  return out
}

export function buildEventStats(viewerId?: string): EventStats {
  const all = withRegistered(events)
  const typeCounts: Record<string, number> = {}
  for (const e of all) typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1
  const years = [...new Set(all.map((e) => new Date(e.starts_at).getUTCFullYear()))].sort((a, b) => b - a)
  const upcoming = all.filter((e) => e.status === 'upcoming')
  const myUpcoming = viewerId
    ? eventRegistrations.filter(
        (r) =>
          r.userId === viewerId &&
          r.status === 'registered' &&
          upcoming.some((e) => e.slug === r.eventSlug),
      ).length
    : 0

  return {
    total_events: all.length,
    upcoming: upcoming.length,
    past: all.filter((e) => e.status === 'past').length,
    total_registered: all.reduce((sum, e) => sum + e.registered, 0),
    by_type: Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    years,
    featured: upcoming.filter((e) => e.featured).slice(0, 3),
    next_events: upcoming
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .slice(0, 5)
      .map((e) => ({
        slug: e.slug,
        title: e.title,
        type: e.type,
        starts_at: e.starts_at,
        registered: e.registered,
        capacity: e.capacity,
      })),
    my_upcoming: myUpcoming,
  }
}
