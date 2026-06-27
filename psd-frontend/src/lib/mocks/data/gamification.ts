import type { Gamification } from '@/types/api'

export const MOCK_BADGES = [
  { id: 'langkah-pertama', name: 'Langkah Pertama', tier: 'bronze' as const, description: 'Membuat aset pertama', earned: true },
  { id: 'terhubung', name: 'Terhubung', tier: 'bronze' as const, description: 'Memiliki 10 pengikut', earned: true },
  { id: 'populer', name: 'Populer', tier: 'silver' as const, description: 'Aset mencapai 50 suka', earned: false },
  { id: 'berbagi-ilmu', name: 'Berbagi Ilmu', tier: 'silver' as const, description: 'Menerbitkan course pertama', earned: false },
  { id: 'kontributor-aktif', name: 'Kontributor Aktif', tier: 'bronze' as const, description: 'Membuka 10 diskusi', earned: false },
  { id: 'ramai', name: 'Ramai', tier: 'silver' as const, description: 'Postingan mencapai 25 suka', earned: false },
  { id: 'juara', name: 'Juara', tier: 'gold' as const, description: 'Peringkat 1 leaderboard kompetisi', earned: false },
  { id: 'berpengaruh', name: 'Berpengaruh', tier: 'gold' as const, description: 'Memiliki 500 pengikut', earned: false },
]

export const mockGamificationByUser: Record<string, { reputation: number; tier: Gamification['tier']; badges: string[] }> = {
  psd: {
    reputation: 1240,
    tier: { level: 3, name: 'Master', reputation: 1240, next_at: 5000 },
    badges: ['langkah-pertama', 'berbagi-ilmu', 'populer', 'berpengaruh'],
  },
  'budi-santoso': {
    reputation: 312,
    tier: { level: 2, name: 'Ahli', reputation: 312, next_at: 1000 },
    badges: ['langkah-pertama', 'terhubung', 'kontributor-aktif'],
  },
  'siti-rahayu': {
    reputation: 68,
    tier: { level: 1, name: 'Kontributor', reputation: 68, next_at: 250 },
    badges: ['langkah-pertama'],
  },
  'admin-psd': {
    reputation: 890,
    tier: { level: 3, name: 'Master', reputation: 890, next_at: 5000 },
    badges: ['langkah-pertama', 'juara'],
  },
}

export function mockGamificationFor(username: string) {
  const base = mockGamificationByUser[username] ?? {
    reputation: 12,
    tier: { level: 0, name: 'Pemula', reputation: 12, next_at: 50 },
    badges: [] as string[],
  }
  return {
    tier: base.tier,
    perks: {
      upload_max_mb: [50, 100, 200, 500, 1000][base.tier.level],
      daily_submission_bonus: [0, 2, 5, 10, 20][base.tier.level],
      notebook_quota: [5, 20, 50, 100, 1000][base.tier.level],
      event_priority: base.tier.level >= 2,
      can_create_event: base.tier.level >= 3,
      daily_post_limit: [5, 15, 30, 60, 100][base.tier.level],
      post_image_max: [1, 4, 6, 8, 10][base.tier.level],
    },
    badges: MOCK_BADGES.map((b) => ({ ...b, earned: base.badges.includes(b.id) })),
  }
}

export const mockContributors = [
  { rank: 1, reputation: 1240, tier: 'Master', user: { username: 'psd', type: 'org' as const, avatar_url: null, is_official: true } },
  { rank: 2, reputation: 890, tier: 'Master', user: { username: 'admin-psd', type: 'user' as const, avatar_url: null, is_official: false } },
  { rank: 3, reputation: 312, tier: 'Ahli', user: { username: 'budi-santoso', type: 'user' as const, avatar_url: null, is_official: false } },
  { rank: 4, reputation: 68, tier: 'Kontributor', user: { username: 'siti-rahayu', type: 'user' as const, avatar_url: null, is_official: false } },
  { rank: 5, reputation: 52, tier: 'Kontributor', user: { username: 'humas-psd', type: 'user' as const, avatar_url: null, is_official: false } },
  { rank: 6, reputation: 41, tier: 'Kontributor', user: { username: 'itera-ds', type: 'org' as const, avatar_url: null, is_official: false } },
  { rank: 7, reputation: 34, tier: 'Pemula', user: { username: 'umkm-lampung', type: 'org' as const, avatar_url: null, is_official: false } },
  { rank: 8, reputation: 28, tier: 'Pemula', user: { username: 'umkm-demand-challenged', type: 'org' as const, avatar_url: null, is_official: false } },
  { rank: 9, reputation: 19, tier: 'Pemula', user: { username: 'data-analyst-jkt', type: 'user' as const, avatar_url: null, is_official: false } },
  { rank: 10, reputation: 14, tier: 'Pemula', user: { username: 'ml-lampung', type: 'user' as const, avatar_url: null, is_official: false } },
]
