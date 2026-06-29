import type { LikedAsset, LikedSummary, PaginatedResult } from '@/types/api'
import { getMockAssetStats } from './engagement'
import { notebookRecords } from './notebooks'
import { repos } from './repos'
import { users } from './users'

type LikedSettings = { list_public: boolean; default_public: boolean }

type LikedRow = {
  asset_key: string
  is_public: boolean
  liked_at: string
}

const settingsStore = new Map<string, LikedSettings>()
const itemsStore = new Map<string, LikedRow[]>()

function assetKey(kind: string, slug: string) {
  return `${kind}:${slug}`
}

function isAssetKey(key: string) {
  const kind = key.split(':', 1)[0]
  return !['post', 'thread', 'comment', 'feed', 'forum'].includes(kind) && key.includes(':')
}

function getSettings(userId: string): LikedSettings {
  return settingsStore.get(userId) ?? { list_public: true, default_public: true }
}

function getItems(userId: string): LikedRow[] {
  return itemsStore.get(userId) ?? []
}

function setItems(userId: string, items: LikedRow[]) {
  itemsStore.set(userId, items)
}

function hrefFor(kind: string, slug: string) {
  if (kind === 'notebook') return `/notebooks/${slug}`
  const [owner, name] = slug.split('/', 2)
  if (!owner || !name) return '/explore'
  const plural = kind === 'project' ? 'projects' : `${kind}s`
  return `/${plural}/${owner}/${name}`
}

function enrich(row: LikedRow): LikedAsset | null {
  const [kind, ...rest] = row.asset_key.split(':')
  const slug = rest.join(':')
  if (!kind || !slug) return null

  if (kind === 'notebook') {
    const nb = notebookRecords.find((n) => n.id === slug)
    if (!nb) return null
    const stats = getMockAssetStats(kind, slug)
    return {
      kind,
      slug,
      title: nb.title,
      owner: nb.owner,
      stats: { love_count: stats.love_count, download_count: stats.download_count },
      href: hrefFor(kind, slug),
      is_public: row.is_public,
      liked_at: row.liked_at,
    }
  }

  const repo = repos.find((r) => r.kind === kind && r.slug === slug)
  if (!repo) return null
  const stats = getMockAssetStats(kind, slug)
  return {
    kind,
    slug,
    title: repo.name,
    owner: repo.owner,
    stats: { love_count: stats.love_count, download_count: stats.download_count },
    href: hrefFor(kind, slug),
    is_public: row.is_public,
    liked_at: row.liked_at,
  }
}

function filterForViewer(userId: string, viewerId: string | null, items: LikedRow[]) {
  const settings = getSettings(userId)
  if (viewerId === userId) return items
  if (!settings.list_public) return []
  return items.filter((i) => i.is_public)
}

function publicCount(userId: string) {
  const settings = getSettings(userId)
  if (!settings.list_public) return 0
  return getItems(userId).filter((i) => i.is_public).length
}

function seed() {
  const budi = users.find((u) => u.username === 'budi-santoso')
  if (!budi || itemsStore.has(budi.id)) return
  settingsStore.set(budi.id, { list_public: true, default_public: true })
  setItems(budi.id, [
    {
      asset_key: assetKey('dataset', 'psd/ulasan-marketplace-id'),
      is_public: true,
      liked_at: '2025-06-01T10:00:00Z',
    },
    {
      asset_key: assetKey('model', 'itera-ds/xgb-tabular-baseline'),
      is_public: false,
      liked_at: '2025-06-02T12:00:00Z',
    },
    {
      asset_key: assetKey('notebook', 'nb_02'),
      is_public: true,
      liked_at: '2025-06-03T08:30:00Z',
    },
  ])
}

seed()

export function syncMockLikedOnLove(userId: string, kind: string, slug: string, loved: boolean) {
  if (!isAssetKey(assetKey(kind, slug))) return
  const key = assetKey(kind, slug)
  const items = [...getItems(userId)]
  const idx = items.findIndex((i) => i.asset_key === key)
  if (loved) {
    if (idx === -1) {
      const settings = getSettings(userId)
      items.unshift({
        asset_key: key,
        is_public: settings.default_public,
        liked_at: new Date().toISOString(),
      })
      setItems(userId, items)
    }
  } else if (idx !== -1) {
    items.splice(idx, 1)
    setItems(userId, items)
  }
}

export function getMockLikedPage(
  userId: string,
  viewerId: string | null,
  page: number,
  pageSize = 20,
): PaginatedResult<LikedAsset> {
  const filtered = filterForViewer(userId, viewerId, getItems(userId))
  const start = (page - 1) * pageSize
  const slice = filtered.slice(start, start + pageSize)
  const items = slice.map(enrich).filter((x): x is LikedAsset => x !== null)
  return { items, total: filtered.length, page, page_size: pageSize }
}

export function getMockLikedSummary(userId: string, viewerId: string | null): LikedSummary {
  const settings = getSettings(userId)
  const items = getItems(userId)
  const visible = filterForViewer(userId, viewerId, items)
  if (viewerId !== userId && !settings.list_public) {
    return { list_public: false, public_count: 0, total_count: 0 }
  }
  const summary: LikedSummary = {
    list_public: settings.list_public,
    public_count: publicCount(userId),
    total_count: viewerId === userId ? items.length : visible.length,
  }
  if (viewerId === userId) {
    summary.default_public = settings.default_public
  }
  return summary
}

export function patchMockLikedItemVisibility(userId: string, kind: string, slug: string, is_public: boolean) {
  const key = assetKey(kind, slug)
  if (!isAssetKey(key)) throw new Error('not_asset')
  const items = [...getItems(userId)]
  const row = items.find((i) => i.asset_key === key)
  if (!row) throw new Error('not_found')
  row.is_public = is_public
  setItems(userId, items)
  return { asset_key: key, is_public }
}

export function patchMockLikedListSettings(
  userId: string,
  patch: { list_public?: boolean; default_public?: boolean },
) {
  const current = getSettings(userId)
  const next = {
    list_public: patch.list_public ?? current.list_public,
    default_public: patch.default_public ?? current.default_public,
  }
  settingsStore.set(userId, next)
  return next
}

export function getMockLikedItemVisibility(userId: string, kind: string, slug: string) {
  const key = assetKey(kind, slug)
  return getItems(userId).find((i) => i.asset_key === key)?.is_public
}
