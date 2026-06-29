import type { DiscoveryPanels, DiscoveryRef } from '@/types/api'
import { owners, users } from './users'
import { followersOf } from './social'

function ref(
  username: string,
  reason: string,
  extra: Partial<DiscoveryRef> = {},
): DiscoveryRef {
  const u = users.find((x) => x.username === username)
  const owner = Object.values(owners).find((o) => o.username === username)
  return {
    username,
    type: owner?.type ?? (u?.account_type === 'organization' ? 'org' : 'user'),
    avatar_url: owner?.avatar_url ?? u?.avatar_url ?? null,
    is_official: owner?.is_official ?? u?.is_official ?? false,
    reputation: u?.reputation ?? 120,
    tier: 'Kontributor',
    reason,
    ...extra,
  }
}

export function buildDiscoveryPanels(viewerId?: string): DiscoveryPanels {
  const viewer = viewerId ? users.find((u) => u.id === viewerId) : undefined
  const following = viewerId ? new Set<string>() : new Set<string>()

  const affiliation: DiscoveryRef[] = []
  if (viewer?.username === 'siti-rahayu' || viewer?.username === 'budi-santoso') {
    const peers = ['budi-santoso', 'siti-rahayu', 'itera-ds'].filter(
      (name) => name !== viewer?.username && !following.has(name),
    )
    for (const name of peers) {
      affiliation.push(
        ref(name, 'Sesama Institut Teknologi Sumatera', {
          tier: name === 'itera-ds' ? 'Organisasi' : 'Pemula',
        }),
      )
    }
  }

  return {
    affiliation,
    top_tier: [
      ref('psd', 'Tier Grandmaster', { reputation: 12000, tier: 'Grandmaster', is_official: true }),
      ref('budi-santoso', 'Tier Ahli', { reputation: 2400, tier: 'Ahli' }),
    ].filter((p) => p.username !== viewer?.username),
    popular: [
      ref('psd', '1.2rb pengikut', { reputation: 12000, tier: 'Grandmaster' }),
      ref('budi-santoso', `${followersOf('usr_01').length} pengikut`, { tier: 'Ahli' }),
      ref('siti-rahayu', `${followersOf('usr_02').length} pengikut`),
    ].filter((p) => p.username !== viewer?.username),
    new_members: [ref('siti-rahayu', 'Anggota baru', { tier: 'Pemula' })].filter(
      (p) => p.username !== viewer?.username,
    ),
    achievements: [
      ref('budi-santoso', 'Meraih Berbagi Ilmu', { tier: 'Ahli' }),
      ref('psd', 'Meraih Berpengaruh', { tier: 'Grandmaster', is_official: true }),
    ].filter((p) => p.username !== viewer?.username),
  }
}

export function discoveryListForKind(kind: string, viewerId?: string): DiscoveryRef[] {
  const panels = buildDiscoveryPanels(viewerId)
  const map: Record<string, keyof DiscoveryPanels> = {
    'top-tier': 'top_tier',
    popular: 'popular',
    new: 'new_members',
    achievements: 'achievements',
    similar: 'affiliation',
  }
  return panels[map[kind] ?? 'popular'] ?? []
}
