import type { Gamification } from '@/types/api'
import { ACHIEVEMENT_BADGES, perksFromTierSlug, tierSlugFromLevel } from '@/lib/gamification/config'

export const MOCK_BADGES = Object.entries(ACHIEVEMENT_BADGES).map(([id, meta]) => ({
  id,
  name: meta.name,
  tier: meta.tier,
  description: meta.description,
  earned: id === 'langkah-pertama' || id === 'terhubung',
}))

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
  const slug = tierSlugFromLevel(base.tier.level)
  return {
    tier: base.tier,
    perks: perksFromTierSlug(slug),
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
