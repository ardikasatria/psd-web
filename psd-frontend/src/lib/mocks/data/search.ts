import type { SearchHit, SearchKind } from '@/types/api'
import { competitions, detailOf as competitionDetailOf } from './competitions'
import { events } from './events'
import { threads } from './forum'
import { notebookRecords } from './notebooks'
import { repos } from './repos'
import { mockPosts } from './social'
import { mockTeams, memberCount } from './teams'
import { isMockUserSearchable } from './settings'
import { users } from './users'

type RawHit = SearchHit & { popularity: number }

/** Bobot tipe untuk peringkat lintas kategori. */
const KIND_WEIGHT: Record<SearchKind, number> = {
  user: 1.15,
  org: 1.2,
  competition: 1.1,
  project: 1,
  model: 1,
  dataset: 1,
  notebook: 0.95,
  event: 1.05,
  team: 1.05,
  forum: 0.9,
  post: 0.8,
}

/** Alias tipe ID/EN → kind kanonik. */
const TYPE_ALIAS: Record<string, SearchKind> = {
  akun: 'user',
  user: 'user',
  users: 'user',
  pengguna: 'user',
  organisasi: 'org',
  org: 'org',
  orgs: 'org',
  postingan: 'post',
  post: 'post',
  posts: 'post',
  feed: 'post',
  proyek: 'project',
  project: 'project',
  projects: 'project',
  repos: 'project',
  model: 'model',
  models: 'model',
  dataset: 'dataset',
  datasets: 'dataset',
  notebook: 'notebook',
  notebooks: 'notebook',
  kompetisi: 'competition',
  competition: 'competition',
  competitions: 'competition',
  event: 'event',
  events: 'event',
  acara: 'event',
  tim: 'team',
  team: 'team',
  teams: 'team',
  forum: 'forum',
  diskusi: 'forum',
}

export type ParsedQuery = {
  text: string
  filters: {
    type?: SearchKind
    username?: string
    tag?: string
    owner?: string
  }
}

/** Parse operator: `type:`, `@user`, `#tag`, `owner:`. */
export function parseSearchQuery(raw: string, typeParam?: string | null): ParsedQuery {
  const filters: ParsedQuery['filters'] = {}
  const tokens = raw.trim().split(/\s+/).filter(Boolean)
  const textTokens: string[] = []

  for (const token of tokens) {
    const lower = token.toLowerCase()
    if (lower.startsWith('type:')) {
      const alias = lower.slice(5)
      if (TYPE_ALIAS[alias]) filters.type = TYPE_ALIAS[alias]
    } else if (token.startsWith('@') && token.length > 1) {
      filters.username = token.slice(1).toLowerCase()
      textTokens.push(token.slice(1))
    } else if (token.startsWith('#') && token.length > 1) {
      filters.tag = token.slice(1).toLowerCase()
    } else if (lower.startsWith('owner:')) {
      filters.owner = lower.slice(6)
    } else {
      textTokens.push(token)
    }
  }

  if (typeParam && TYPE_ALIAS[typeParam.toLowerCase()]) {
    filters.type = TYPE_ALIAS[typeParam.toLowerCase()]
  }

  return { text: textTokens.join(' ').trim(), filters }
}

/** Skor relevansi teks: exact > prefix > substring > token. */
function textScore(haystack: string, text: string): number {
  if (!text) return 0.5 // mode jelajah: skor rata, popularitas menentukan
  const h = haystack.toLowerCase()
  const t = text.toLowerCase()
  if (h === t) return 1
  if (h.startsWith(t)) return 0.85
  if (h.includes(t)) return 0.7
  const tokens = t.split(/\s+/).filter(Boolean)
  const matched = tokens.filter((tok) => h.includes(tok)).length
  if (matched === 0) return 0
  return 0.4 * (matched / tokens.length)
}

function scoreHit(hit: RawHit, parsed: ParsedQuery): number {
  const base = textScore(`${hit.title} ${hit.subtitle ?? ''}`, parsed.text)
  if (base === 0 && parsed.text) return 0
  const weight = KIND_WEIGHT[hit.kind] ?? 1
  const popBoost = Math.log10((hit.popularity ?? 0) + 10) / 3
  return base * weight + (base > 0 ? popBoost : 0)
}

// --- Sumber per entitas ---

function userHits(): RawHit[] {
  const out: RawHit[] = []
  for (const u of users) {
    if (!isMockUserSearchable(u.id)) continue
    const isOrg = u.account_type === 'organization'
    out.push({
      kind: isOrg ? 'org' : 'user',
      id: u.username,
      title: u.name,
      subtitle: isOrg ? 'Organisasi' : `@${u.username}`,
      url: `/${u.username}`,
      avatar_url: u.avatar_url,
      is_official: u.is_official,
      popularity: 100,
    })
  }
  return out
}

function repoHits(): RawHit[] {
  return repos
    .filter((r) => r.visibility === 'public')
    .map((r) => ({
      kind: r.kind as SearchKind,
      id: r.id,
      title: r.name,
      subtitle: `${r.owner.username} · ${r.description}`.slice(0, 120),
      url: `/${r.kind === 'project' ? 'projects' : r.kind === 'dataset' ? 'datasets' : 'models'}/${r.owner.username}/${r.name}`,
      popularity: (r.likes ?? 0) + (r.downloads ?? 0),
      _tags: r.tags,
      _owner: r.owner.username,
    })) as unknown as RawHit[]
}

function notebookHits(): RawHit[] {
  return notebookRecords
    .filter((n) => !!n.id)
    .map((n) => ({
      kind: 'notebook' as const,
      id: n.id!,
      title: n.title,
      subtitle: `${n.owner.username} · ${n.description}`.slice(0, 120),
      url: `/notebooks/${n.id}`,
      popularity: 40,
      _tags: n.tags,
      _owner: n.owner.username,
    })) as unknown as RawHit[]
}

function competitionHits(): RawHit[] {
  return competitions.map((c) => ({
    kind: 'competition' as const,
    id: c.slug,
    title: c.title,
    subtitle: c.sponsor ?? 'Kompetisi',
    url: `/competitions/${c.slug}`,
    popularity: c.participants ?? 0,
    _tags: competitionDetailOf(c).tags,
  })) as unknown as RawHit[]
}

function eventHits(): RawHit[] {
  return events.map((e) => ({
    kind: 'event' as const,
    id: e.slug,
    title: e.title,
    subtitle: e.location ?? 'Event',
    url: `/events/${e.slug}`,
    popularity: e.registered ?? 0,
  }))
}

function teamHits(): RawHit[] {
  return mockTeams
    .filter((t) => t.visibility === 'public')
    .map((t) => ({
      kind: 'team' as const,
      id: t.slug,
      title: t.name,
      subtitle: t.focus ?? t.description.slice(0, 80) ?? 'Tim',
      url: `/teams/${t.slug}`,
      popularity: memberCount(t.id),
    }))
}

function forumHits(): RawHit[] {
  return threads.map((t) => ({
    kind: 'forum' as const,
    id: t.id,
    title: t.title,
    subtitle: `Forum · ${t.replies ?? 0} balasan`,
    url: `/forum/${t.id}`,
    popularity: (t.replies ?? 0) * 3,
    _tags: t.tags,
    _owner: t.author.username,
  })) as unknown as RawHit[]
}

function postHits(): RawHit[] {
  return mockPosts
    .filter((p) => (p.visibility ?? 'public') === 'public')
    .map((p) => ({
      kind: 'post' as const,
      id: p.id,
      title: p.body_md.replace(/[#*_`>]/g, '').slice(0, 80),
      subtitle: `Postingan · @${p.author.username}`,
      url: `/community/post/${p.id}`,
      popularity: (p.like_count ?? 0) + (p.comment_count ?? 0),
      _owner: p.author.username,
    })) as unknown as RawHit[]
}

function allHits(): RawHit[] {
  return [
    ...userHits(),
    ...repoHits(),
    ...notebookHits(),
    ...competitionHits(),
    ...eventHits(),
    ...teamHits(),
    ...forumHits(),
    ...postHits(),
  ]
}

function applyFilters(hits: RawHit[], parsed: ParsedQuery): RawHit[] {
  let out = hits
  if (parsed.filters.type) {
    out = out.filter((h) => h.kind === parsed.filters.type)
  }
  if (parsed.filters.username) {
    out = out.filter(
      (h) =>
        (h.kind === 'user' || h.kind === 'org') &&
        h.id.toLowerCase().includes(parsed.filters.username!),
    )
  }
  if (parsed.filters.tag) {
    out = out.filter((h) => {
      const tags = (h as unknown as { _tags?: string[] })._tags
      return tags?.some((t) => t.toLowerCase() === parsed.filters.tag)
    })
  }
  if (parsed.filters.owner) {
    out = out.filter((h) => {
      const owner = (h as unknown as { _owner?: string })._owner
      return owner?.toLowerCase().includes(parsed.filters.owner!)
    })
  }
  return out
}

function stripInternal(hit: RawHit): SearchHit {
  const { popularity: _pop, ...rest } = hit as RawHit & Record<string, unknown>
  delete (rest as Record<string, unknown>)._tags
  delete (rest as Record<string, unknown>)._owner
  return rest as SearchHit
}

export type UniversalSearchResult = {
  query: { text: string; filters: Record<string, unknown> }
  total: number
  results: SearchHit[]
  grouped: Record<string, SearchHit[]>
}

export function runUniversalSearch(
  rawQuery: string,
  opts: { type?: string | null; limit?: number; perCategory?: number; page?: number } = {},
): UniversalSearchResult {
  const parsed = parseSearchQuery(rawQuery, opts.type)
  const limit = opts.limit ?? 30
  const page = opts.page ?? 1

  const candidates = applyFilters(allHits(), parsed)
    .map((h) => ({ hit: h, score: scoreHit(h, parsed) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => ({ ...x.hit, score: Math.round(x.score * 100) / 100 }))

  const total = candidates.length

  // Halaman hasil: paginasi results.
  const start = (page - 1) * limit
  const paged = candidates.slice(start, start + limit)
  const results = paged.map(stripInternal)

  // Dropdown: kelompokkan per kategori, batasi per_category.
  const grouped: Record<string, SearchHit[]> = {}
  const perCategory = opts.perCategory
  for (const hit of candidates) {
    const key = hit.kind
    if (!grouped[key]) grouped[key] = []
    if (perCategory && grouped[key].length >= perCategory) continue
    grouped[key].push(stripInternal(hit))
  }

  return {
    query: { text: parsed.text, filters: parsed.filters as Record<string, unknown> },
    total,
    results,
    grouped,
  }
}
