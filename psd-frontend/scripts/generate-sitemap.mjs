/**
 * Generate public/sitemap.xml at build time (static file for crawlers).
 * Falls back to static URLs if API is unreachable during build.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://projeksainsdata.com').replace(/\/$/, '')
const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
const apiPrefix = '/api/v1'

const STATIC_PAGES = [
  { path: '/', changeFrequency: 'daily', priority: '1.0' },
  { path: '/explore', changeFrequency: 'daily', priority: '0.9' },
  { path: '/about', changeFrequency: 'monthly', priority: '0.7' },
  { path: '/blog', changeFrequency: 'daily', priority: '0.8' },
  { path: '/learn', changeFrequency: 'weekly', priority: '0.9' },
  { path: '/paths', changeFrequency: 'weekly', priority: '0.8' },
  { path: '/events', changeFrequency: 'daily', priority: '0.8' },
  { path: '/competitions', changeFrequency: 'daily', priority: '0.8' },
  { path: '/projects', changeFrequency: 'daily', priority: '0.8' },
  { path: '/datasets', changeFrequency: 'daily', priority: '0.9' },
  { path: '/models', changeFrequency: 'daily', priority: '0.8' },
  { path: '/notebooks', changeFrequency: 'weekly', priority: '0.6' },
  { path: '/forum', changeFrequency: 'daily', priority: '0.7' },
  { path: '/leaderboard', changeFrequency: 'weekly', priority: '0.6' },
  { path: '/categories', changeFrequency: 'weekly', priority: '0.7' },
  { path: '/collections', changeFrequency: 'weekly', priority: '0.7' },
  { path: '/transformer', changeFrequency: 'weekly', priority: '0.7' },
  { path: '/help', changeFrequency: 'monthly', priority: '0.5' },
]

const LEGAL_SLUGS = ['ketentuan-layanan', 'kebijakan-privasi']
const HELP_SLUGS = [
  'apa-itu-psd',
  'panduan-memulai',
  'git-menyiapkan-akses',
  'git-clone-push',
  'git-lfs-kontribusi',
  'notebook-membuka',
  'notebook-dataset-sdk',
  'notebook-simpan-push',
  'faq',
  'pedoman-komunitas',
]

/** @typedef {{ loc: string, lastmod?: string, changefreq?: string, priority?: string }} UrlEntry */

/** @type {UrlEntry[]} */
const entries = []

function addEntry(loc, { changefreq, priority, lastmod } = {}) {
  entries.push({
    loc,
    ...(lastmod ? { lastmod } : {}),
    ...(changefreq ? { changefreq } : {}),
    ...(priority ? { priority } : {}),
  })
}

function isoDate(value) {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10)
}

async function fetchJson(path) {
  const res = await fetch(`${apiBase}${apiPrefix}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return res.json()
}

async function fetchAllPages(pathBuilder) {
  const items = []
  for (let page = 1; page <= 50; page++) {
    const data = await fetchJson(pathBuilder(page))
    const batch = data.items ?? data
    if (!Array.isArray(batch) || batch.length === 0) break
    items.push(...batch)
    if (typeof data.total === 'number' && items.length >= data.total) break
    if (batch.length < 100) break
  }
  return items
}

function repoPath(kind, owner, name) {
  const segment = kind === 'project' ? 'projects' : kind === 'dataset' ? 'datasets' : 'models'
  return `/${segment}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
}

function addStaticEntries() {
  for (const page of STATIC_PAGES) {
    addEntry(`${siteUrl}${page.path}`, { changefreq: page.changeFrequency, priority: page.priority })
  }
  for (const slug of LEGAL_SLUGS) {
    addEntry(`${siteUrl}/legal/${slug}`, { changefreq: 'monthly', priority: '0.4' })
  }
  for (const slug of HELP_SLUGS) {
    addEntry(`${siteUrl}/help/${slug}`, { changefreq: 'monthly', priority: '0.4' })
  }
}

async function addDynamicEntries() {
  const tasks = [
    fetchAllPages((p) => `/blog?page=${p}&page_size=100`).then((posts) => {
      for (const post of posts) {
        if (!post.published_at || !post.slug) continue
        addEntry(`${siteUrl}/blog/${post.slug}`, {
          changefreq: 'weekly',
          priority: '0.7',
          lastmod: isoDate(post.published_at),
        })
      }
    }),
    fetchAllPages((p) => `/courses?page=${p}&page_size=100`).then((courses) => {
      for (const c of courses) {
        if (!c.slug) continue
        addEntry(`${siteUrl}/learn/${c.slug}`, { changefreq: 'weekly', priority: '0.8' })
      }
    }),
    fetchAllPages((p) => `/learning-paths?page=${p}&page_size=100`).then((paths) => {
      for (const p of paths) {
        if (!p.slug) continue
        addEntry(`${siteUrl}/paths/${p.slug}`, { changefreq: 'weekly', priority: '0.7' })
      }
    }),
    fetchAllPages((p) => `/events?page=${p}&page_size=100`).then((events) => {
      for (const e of events) {
        if (!e.slug) continue
        addEntry(`${siteUrl}/events/${e.slug}`, { changefreq: 'weekly', priority: '0.7' })
      }
    }),
    fetchAllPages((p) => `/competitions?page=${p}&page_size=100`).then((comps) => {
      for (const c of comps) {
        if (!c.slug) continue
        addEntry(`${siteUrl}/competitions/${c.slug}`, { changefreq: 'weekly', priority: '0.7' })
      }
    }),
    ...(['project', 'dataset', 'model'].map((kind) =>
      fetchAllPages((p) => `/${kind === 'project' ? 'projects' : kind === 'dataset' ? 'datasets' : 'models'}?page=${p}&page_size=100`).then(
        (repos) => {
          for (const r of repos) {
            if (r.visibility !== 'public' || !r.owner?.username || !r.name) continue
            addEntry(`${siteUrl}${repoPath(kind, r.owner.username, r.name)}`, {
              changefreq: 'weekly',
              priority: kind === 'dataset' ? '0.7' : '0.6',
              lastmod: isoDate(r.updated_at),
            })
          }
        },
      ),
    )),
    fetchJson('/categories').then((categories) => {
      for (const c of categories) {
        if (!c.slug) continue
        addEntry(`${siteUrl}/categories/${c.slug}`, { changefreq: 'weekly', priority: '0.6' })
      }
    }),
    fetchAllPages((p) => `/collections?page=${p}&page_size=100`).then((collections) => {
      for (const c of collections) {
        if (!c.slug) continue
        addEntry(`${siteUrl}/collections/${c.slug}`, { changefreq: 'weekly', priority: '0.6' })
      }
    }),
  ]

  const results = await Promise.allSettled(tasks)
  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    console.warn(`[sitemap] ${failed} sumber dinamis gagal (pakai halaman statis saja)`)
  }
}

function toXml() {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]
  const seen = new Set()
  for (const e of entries) {
    if (seen.has(e.loc)) continue
    seen.add(e.loc)
    lines.push('  <url>')
    lines.push(`    <loc>${escapeXml(e.loc)}</loc>`)
    if (e.lastmod) lines.push(`    <lastmod>${e.lastmod}</lastmod>`)
    if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`)
    if (e.priority) lines.push(`    <priority>${e.priority}</priority>`)
    lines.push('  </url>')
  }
  lines.push('</urlset>')
  return lines.join('\n') + '\n'
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function main() {
  addStaticEntries()
  try {
    await addDynamicEntries()
  } catch (err) {
    console.warn('[sitemap] API tidak terjangkau:', err instanceof Error ? err.message : err)
  }

  const sitemapOut = join(publicDir, 'sitemap.xml')
  writeFileSync(sitemapOut, toXml(), 'utf8')
  console.log(`[sitemap] ${entries.length} URL → ${sitemapOut}`)

  const robotsOut = join(publicDir, 'robots.txt')
  writeFileSync(
    robotsOut,
    `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /settings/
Disallow: /me/
Disallow: /studio/
Disallow: /notifications/
Disallow: /m/
Disallow: /factory/
Disallow: /analytics/
Disallow: /idea-rooms/
Disallow: /synthesis/
Disallow: /api/

Sitemap: ${siteUrl}/sitemap.xml
Host: ${siteUrl}
`,
    'utf8',
  )
  console.log(`[robots] → ${robotsOut}`)
}

main().catch((err) => {
  console.error('[sitemap] gagal:', err)
  process.exit(1)
})
