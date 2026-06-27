import { getBlog } from '@/lib/api/blog'
import { getCategories } from '@/lib/api/categories'
import { listCollections } from '@/lib/api/collections'
import { getCompetitions } from '@/lib/api/competitions'
import { getEvents } from '@/lib/api/events'
import { getCourses, getLearningPaths } from '@/lib/api/learn'
import { getRepos } from '@/lib/api/repos'
import { legalDocuments } from '@/lib/content/legal'
import { helpArticles } from '@/lib/content/help'
import type { RepoKind, RepoSummary } from '@/types/api'
import type { MetadataRoute } from 'next'

type SitemapEntry = MetadataRoute.Sitemap[number]

const STATIC_PAGES: Array<Pick<SitemapEntry, 'changeFrequency' | 'priority'> & { path: string }> = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/explore', changeFrequency: 'daily', priority: 0.9 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/blog', changeFrequency: 'daily', priority: 0.8 },
  { path: '/learn', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/paths', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/events', changeFrequency: 'daily', priority: 0.8 },
  { path: '/competitions', changeFrequency: 'daily', priority: 0.8 },
  { path: '/projects', changeFrequency: 'daily', priority: 0.8 },
  { path: '/datasets', changeFrequency: 'daily', priority: 0.9 },
  { path: '/models', changeFrequency: 'daily', priority: 0.8 },
  { path: '/notebooks', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/forum', changeFrequency: 'daily', priority: 0.7 },
  { path: '/leaderboard', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/categories', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/collections', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/transformer', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/help', changeFrequency: 'monthly', priority: 0.5 },
]

function repoPath(kind: RepoKind, owner: string, name: string): string {
  const segment = kind === 'project' ? 'projects' : kind === 'dataset' ? 'datasets' : 'models'
  return `/${segment}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
}

async function fetchAllRepos(kind: RepoKind): Promise<RepoSummary[]> {
  const pageSize = 100
  const items: RepoSummary[] = []
  for (let page = 1; page <= 50; page++) {
    const batch = await getRepos(kind, { page, page_size: pageSize })
    items.push(...batch.items)
    if (items.length >= batch.total || batch.items.length === 0) break
  }
  return items
}

async function fetchAllPaginated<T extends { slug: string }>(
  fetchPage: (page: number) => Promise<{ items: T[]; total: number }>,
): Promise<T[]> {
  const items: T[] = []
  for (let page = 1; page <= 50; page++) {
    const batch = await fetchPage(page)
    items.push(...batch.items)
    if (items.length >= batch.total || batch.items.length === 0) break
  }
  return items
}

function entry(url: string, opts: Pick<SitemapEntry, 'changeFrequency' | 'priority'> & { lastModified?: Date }): SitemapEntry {
  return {
    url,
    lastModified: opts.lastModified ?? new Date(),
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
  }
}

export async function buildSitemapEntries(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) =>
    entry(`${siteUrl}${page.path}`, {
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    }),
  )

  for (const doc of legalDocuments) {
    entries.push(
      entry(`${siteUrl}/legal/${doc.slug}`, { changeFrequency: 'monthly', priority: 0.4 }),
    )
  }

  for (const article of helpArticles) {
    entries.push(
      entry(`${siteUrl}/help/${article.slug}`, { changeFrequency: 'monthly', priority: 0.4 }),
    )
  }

  const dynamicFetches: Array<Promise<SitemapEntry[]>> = [
    fetchAllPaginated((page) => getBlog({ page, page_size: 100 })).then((posts) =>
      posts
        .filter((p) => p.published_at)
        .map((p) =>
          entry(`${siteUrl}/blog/${p.slug}`, {
            changeFrequency: 'weekly',
            priority: 0.7,
            lastModified: p.published_at ? new Date(p.published_at) : undefined,
          }),
        ),
    ),
    fetchAllPaginated((page) => getCourses({ page, page_size: 100 })).then((courses) =>
      courses.map((c) =>
        entry(`${siteUrl}/learn/${c.slug}`, { changeFrequency: 'weekly', priority: 0.8 }),
      ),
    ),
    fetchAllPaginated((page) => getLearningPaths({ page })).then((paths) =>
      paths.map((p) =>
        entry(`${siteUrl}/paths/${p.slug}`, { changeFrequency: 'weekly', priority: 0.7 }),
      ),
    ),
    fetchAllPaginated((page) => getEvents({ page })).then((events) =>
      events.map((e) =>
        entry(`${siteUrl}/events/${e.slug}`, { changeFrequency: 'weekly', priority: 0.7 }),
      ),
    ),
    fetchAllPaginated((page) => getCompetitions({ page })).then((comps) =>
      comps.map((c) =>
        entry(`${siteUrl}/competitions/${c.slug}`, { changeFrequency: 'weekly', priority: 0.7 }),
      ),
    ),
    fetchAllRepos('project').then((repos) =>
      repos
        .filter((r) => r.visibility === 'public')
        .map((r) =>
          entry(`${siteUrl}${repoPath('project', r.owner.username, r.name)}`, {
            changeFrequency: 'weekly',
            priority: 0.6,
            lastModified: r.updated_at ? new Date(r.updated_at) : undefined,
          }),
        ),
    ),
    fetchAllRepos('dataset').then((repos) =>
      repos
        .filter((r) => r.visibility === 'public')
        .map((r) =>
          entry(`${siteUrl}${repoPath('dataset', r.owner.username, r.name)}`, {
            changeFrequency: 'weekly',
            priority: 0.7,
            lastModified: r.updated_at ? new Date(r.updated_at) : undefined,
          }),
        ),
    ),
    fetchAllRepos('model').then((repos) =>
      repos
        .filter((r) => r.visibility === 'public')
        .map((r) =>
          entry(`${siteUrl}${repoPath('model', r.owner.username, r.name)}`, {
            changeFrequency: 'weekly',
            priority: 0.6,
            lastModified: r.updated_at ? new Date(r.updated_at) : undefined,
          }),
        ),
    ),
    getCategories().then((categories) =>
      categories.flatMap((c) => [
        entry(`${siteUrl}/categories/${c.slug}`, { changeFrequency: 'weekly', priority: 0.6 }),
      ]),
    ),
    fetchAllPaginated((page) => listCollections({ page })).then((collections) =>
      collections.map((c) =>
        entry(`${siteUrl}/collections/${c.slug}`, { changeFrequency: 'weekly', priority: 0.6 }),
      ),
    ),
  ]

  const results = await Promise.allSettled(dynamicFetches)
  for (const result of results) {
    if (result.status === 'fulfilled') {
      entries.push(...result.value)
    }
  }

  return entries
}
