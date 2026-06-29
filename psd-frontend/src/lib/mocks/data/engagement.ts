import type { AssetStats } from '@/types/api'
import { repos } from './repos'
import { notebookRecords } from './notebooks'
import { users } from './users'

const loves = new Set<string>()
const assetStats = new Map<string, AssetStats>()

function key(kind: string, slug: string) {
  return `${kind}:${slug}`
}

function defaultStats(kind: string, slug: string): AssetStats {
  if (kind === 'notebook') {
    const nb = notebookRecords.find((n) => n.id === slug)
    const seed = nb ? nb.id.length * 7 + nb.title.length : 0
    return {
      love_count: seed % 40,
      share_count: 0,
      shares: { feed: 0, forum: 0, external: 0, link: 0 },
      download_count: seed % 120,
      view_count: (seed % 40) * 4,
      liked: false,
    }
  }
  const repo = repos.find((r) => r.kind === kind && r.slug === slug)
  return {
    love_count: repo?.likes ?? 0,
    share_count: 0,
    shares: { feed: 0, forum: 0, external: 0, link: 0 },
    download_count: repo?.downloads ?? 0,
    view_count: Math.floor((repo?.likes ?? 0) * 3.5),
    liked: false,
  }
}

export function getMockAssetStats(kind: string, slug: string, viewerId?: string): AssetStats {
  const k = key(kind, slug)
  const stored = assetStats.get(k)
  const base = stored ?? defaultStats(kind, slug)
  const liked = viewerId ? loves.has(`${viewerId}:${k}`) : false
  const share_count = Object.values(base.shares).reduce((a, b) => a + b, 0)
  return { ...base, share_count, liked }
}

export function toggleMockLove(kind: string, slug: string, viewerId: string) {
  const k = key(kind, slug)
  if (kind === 'notebook') {
    const nb = notebookRecords.find((n) => n.id === slug)
    if (nb && users.find((u) => u.id === viewerId)?.username === nb.owner.username) {
      throw new Error('cannot_love_own')
    }
  } else {
    const repo = repos.find((r) => r.kind === kind && r.slug === slug)
    if (repo && users.find((u) => u.id === viewerId)?.username === repo.owner.username) {
      throw new Error('cannot_love_own')
    }
  }
  const lk = `${viewerId}:${k}`
  const stats = getMockAssetStats(kind, slug, viewerId)
  if (loves.has(lk)) {
    loves.delete(lk)
    stats.love_count = Math.max(0, stats.love_count - 1)
    stats.liked = false
  } else {
    loves.add(lk)
    stats.love_count += 1
    stats.liked = true
  }
  assetStats.set(k, stats)
  return { liked: stats.liked, love_count: stats.love_count }
}

export function mockShare(kind: string, slug: string, channel: 'feed' | 'forum' | 'external' | 'link') {
  const k = key(kind, slug)
  const stats = getMockAssetStats(kind, slug)
  stats.shares[channel] += 1
  stats.share_count = Object.values(stats.shares).reduce((a, b) => a + b, 0)
  assetStats.set(k, stats)
  return { share_count: stats.share_count, shares: stats.shares }
}

export function mockDownload(kind: string, slug: string) {
  const k = key(kind, slug)
  const stats = getMockAssetStats(kind, slug)
  stats.download_count += 1
  assetStats.set(k, stats)
  return { download_count: stats.download_count }
}

export function mockView(kind: string, slug: string) {
  const k = key(kind, slug)
  const stats = getMockAssetStats(kind, slug)
  stats.view_count += 1
  assetStats.set(k, stats)
  return { view_count: stats.view_count }
}

export function getMockUserEngagement(username: string) {
  const userRepos = repos.filter((r) => r.owner.username === username)
  let total_loves = 0
  let total_downloads = 0
  let total_views = 0
  let total_shares = 0
  for (const r of userRepos) {
    const s = getMockAssetStats(r.kind, r.slug)
    total_loves += s.love_count
    total_downloads += s.download_count
    total_views += s.view_count
    total_shares += s.share_count
  }
  return {
    total_loves_received: total_loves,
    total_shares,
    total_downloads,
    total_views,
    asset_count: userRepos.length,
  }
}
