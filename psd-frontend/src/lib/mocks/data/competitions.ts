import type { CompetitionDetail, CompetitionStats, CompetitionSummary, LeaderboardEntry } from '@/types/api'
import { owners } from './users'

export const competitions: CompetitionSummary[] = [
  {
    slug: 'prediksi-permintaan-umkm',
    title: 'Prediksi Permintaan Produk UMKM',
    sponsor: 'Dinas Koperasi & UMKM Lampung',
    status: 'active',
    metric: 'RMSLE',
    participants: 128,
    prize_pool: 'Rp15.000.000',
    starts_at: '2026-06-01T00:00:00Z',
    ends_at: '2026-07-15T23:59:00Z',
    cover_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=400&fit=crop',
    featured: true,
  },
  {
    slug: 'deteksi-penyakit-padi',
    title: 'Deteksi Penyakit Padi dari Citra Drone',
    sponsor: 'ITERA × Dinas Pertanian Sumsel',
    status: 'active',
    metric: 'F1 Score',
    participants: 76,
    prize_pool: 'Rp10.000.000',
    starts_at: '2026-05-15T00:00:00Z',
    ends_at: '2026-07-01T23:59:00Z',
    cover_url: null,
    featured: true,
  },
  {
    slug: 'sentimen-ulasan-ecommerce',
    title: 'Klasifikasi Sentimen Ulasan E-Commerce',
    sponsor: 'PSD Community',
    status: 'upcoming',
    metric: 'Accuracy',
    participants: 0,
    prize_pool: 'Rp5.000.000',
    starts_at: '2026-07-20T00:00:00Z',
    ends_at: '2026-08-20T23:59:00Z',
    cover_url: null,
  },
  {
    slug: 'optimasi-rute-logistik',
    title: 'Optimasi Rute Logistik UMKM',
    sponsor: 'Koperasi Digital Nusantara',
    status: 'upcoming',
    metric: 'Total Distance',
    participants: 0,
    prize_pool: 'Rp8.000.000',
    starts_at: '2026-08-01T00:00:00Z',
    ends_at: '2026-09-15T23:59:00Z',
    cover_url: null,
  },
  {
    slug: 'forecast-cuaca-pertanian-2025',
    title: 'Forecast Cuaca untuk Pertanian 2025',
    sponsor: 'BMKG Kolaborasi',
    status: 'past',
    metric: 'MAE',
    participants: 203,
    prize_pool: 'Rp12.000.000',
    starts_at: '2025-10-01T00:00:00Z',
    ends_at: '2025-12-31T23:59:00Z',
    cover_url: null,
  },
  {
    slug: 'tantangan-umkm-demand',
    title: 'Tantangan: Prediksi UMKM (Ditantangkan)',
    sponsor: 'PSD Community',
    status: 'active',
    metric: 'MAPE < 15% pada horizon 30 hari',
    participants: 12,
    prize_pool: null,
    starts_at: '2026-06-20T00:00:00Z',
    ends_at: '2026-07-04T23:59:00Z',
    cover_url: null,
  },
]

export function detailOf(c: CompetitionSummary): CompetitionDetail {
  const base = {
    daily_submission_limit: 5,
    tags: ['sains-data', 'indonesia'] as string[],
    prizes: [{ rank: 1, reward: 'Rp5.000.000' }],
    overview_md: `Kompetisi ${c.title}. ${c.sponsor ? `Diselenggarakan oleh ${c.sponsor}.` : ''}`,
    rules_md: 'Ikuti pedoman kompetisi dan hormati kode etik komunitas PSD.',
    dataset_info_md: 'Dataset tersedia setelah registrasi kompetisi.',
  }
  if (c.slug === 'prediksi-permintaan-umkm') {
    return {
      ...c,
      ...base,
      overview_md:
        'Bangun model peramalan permintaan mingguan untuk 200 UMKM binaan Dinas Koperasi & UMKM Lampung. Dataset berisi histori penjualan 18 bulan yang sudah dianonimkan.',
      rules_md:
        'Satu peserta maksimal 5 submission per hari. Tim maksimal 3 orang. Dilarang menggunakan data eksternal yang tidak tersedia di dataset resmi.',
      dataset_info_md:
        'Data penjualan historis 18 bulan, anonim per UMKM. Fitur: tanggal, kategori produk, jumlah terjual, harga, promosi.',
      prizes: [{ rank: 1, reward: 'Rp8.000.000 + peluang rekrutmen' }, { rank: 2, reward: 'Rp4.000.000' }, { rank: 3, reward: 'Rp3.000.000' }],
      tags: ['forecasting', 'umkm', 'tabular'],
    }
  }
  return { ...c, ...base }
}

const leaderboardNames = [
  'budi-santoso', 'siti-rahayu', 'data-wizard', 'ml-lampung', 'forecast-pro',
  'umkm-analytics', 'itera-team', 'ds-beginner', 'tabular-king', 'lstm-master',
  'feature-eng', 'baseline-hero', 'ensemble-guru', 'cv-expert', 'nlp-ninja',
  'stats-savvy', 'pandas-pro', 'sklearn-star', 'torch-titan', 'xgboost-x',
]

export function leaderboardOf(slug: string, board: 'public' | 'private' = 'public'): {
  items: LeaderboardEntry[]
  total: number
  page: number
  page_size: number
} {
  const comp = competitions.find((c) => c.slug === slug)
  if (board === 'private' && comp && comp.status !== 'past') {
    throw new Error('leaderboard_locked')
  }
  const items: LeaderboardEntry[] = leaderboardNames.map((username, i) => ({
    rank: i + 1,
    participant: { username, type: i % 3 === 0 ? 'org' : 'user', avatar_url: null },
    score: Math.round((board === 'private' ? 0.44 + i * 0.011 : 0.45 + i * 0.012) * 1000) / 1000,
    submitted_at: `2026-06-${String(20 - Math.min(i, 19)).padStart(2, '0')}T${String(8 + (i % 12)).padStart(2, '0')}:00:00Z`,
  }))
  return { items, total: items.length, page: 1, page_size: 20 }
}

const submissionDailyCount: Record<string, number> = {}

export const submissions = [
  { id: 'sub_01', created_at: '2026-06-22T10:00:00Z', status: 'scored' as const, public_score: 0.4521, filename: 'submission_v3.csv' },
  { id: 'sub_02', created_at: '2026-06-21T15:30:00Z', status: 'scored' as const, public_score: 0.4688, filename: 'submission_v2.csv' },
  { id: 'sub_03', created_at: '2026-06-20T09:00:00Z', status: 'failed' as const, public_score: null, filename: 'submission_v1.csv' },
]

export function getDailyLimit(slug: string) {
  const c = competitions.find((x) => x.slug === slug)
  return 5
}

export function getRemainingToday(slug: string, userId: string) {
  const limit = getDailyLimit(slug)
  const used = submissionDailyCount[`${slug}:${userId}`] ?? 0
  return Math.max(0, limit - used)
}

export function recordSubmission(slug: string, userId: string) {
  const key = `${slug}:${userId}`
  submissionDailyCount[key] = (submissionDailyCount[key] ?? 0) + 1
}

export type CompetitionListFilters = {
  status?: string
  tag?: string
  sort?: 'date' | 'title_asc' | 'title_desc'
  year?: number
  from_date?: string
  to_date?: string
}

export function filterCompetitions(items: CompetitionSummary[], f: CompetitionListFilters): CompetitionSummary[] {
  let out = [...items]
  if (f.status) out = out.filter((c) => c.status === f.status)
  if (f.tag) {
    const tag = f.tag.toLowerCase()
    out = out.filter((c) => detailOf(c).tags.some((t) => t.toLowerCase() === tag))
  }
  if (f.year) out = out.filter((c) => new Date(c.starts_at).getUTCFullYear() === f.year)
  if (f.from_date) {
    const from = new Date(`${f.from_date}T00:00:00Z`).getTime()
    out = out.filter((c) => new Date(c.starts_at).getTime() >= from)
  }
  if (f.to_date) {
    const to = new Date(`${f.to_date}T23:59:59Z`).getTime()
    out = out.filter((c) => new Date(c.starts_at).getTime() <= to)
  }
  if (f.sort === 'title_asc') {
    out.sort((a, b) => a.title.localeCompare(b.title, 'id') || b.starts_at.localeCompare(a.starts_at))
  } else if (f.sort === 'title_desc') {
    out.sort((a, b) => b.title.localeCompare(a.title, 'id') || b.starts_at.localeCompare(a.starts_at))
  } else {
    out.sort((a, b) => b.starts_at.localeCompare(a.starts_at))
  }
  return out
}

export function buildCompetitionStats(viewerId?: string): CompetitionStats {
  const tagCounts: Record<string, number> = {}
  for (const c of competitions) {
    for (const t of detailOf(c).tags) {
      const key = t.toLowerCase()
      tagCounts[key] = (tagCounts[key] ?? 0) + 1
    }
  }
  const years = [...new Set(competitions.map((c) => new Date(c.starts_at).getUTCFullYear()))].sort((a, b) => b - a)
  const active = competitions.filter((c) => c.status === 'active')
  const myActive = viewerId
    ? new Set(
        submissions.length > 0 && viewerId === 'usr_01'
          ? active.map((c) => c.slug)
          : [],
      ).size
    : 0

  return {
    total_competitions: competitions.length,
    active: active.length,
    upcoming: competitions.filter((c) => c.status === 'upcoming').length,
    past: competitions.filter((c) => c.status === 'past').length,
    total_participants: competitions.reduce((sum, c) => sum + c.participants, 0),
    trending_tags: Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    years,
    featured: competitions.filter((c) => c.featured && c.status !== 'past').slice(0, 3),
    hot_active: active
      .sort((a, b) => b.participants - a.participants || a.ends_at.localeCompare(b.ends_at))
      .slice(0, 5)
      .map((c) => ({
        slug: c.slug,
        title: c.title,
        metric: c.metric,
        participants: c.participants,
        prize_pool: c.prize_pool,
        ends_at: c.ends_at,
      })),
    my_active: myActive,
  }
}
