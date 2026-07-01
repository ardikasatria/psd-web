import type { ProfileSearchItem } from '@/types/api'
import { threads } from './forum'
import { notebooks } from './notebooks'
import { repos } from './repos'
import { mockPosts } from './social'
import { users } from './users'

const KIND_PATH: Record<string, string> = {
  project: 'projects',
  dataset: 'datasets',
  model: 'models',
}

function preview(text: string, max = 140) {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length <= max ? one : `${one.slice(0, max - 1).trim()}…`
}

function matches(q: string, ...fields: (string | undefined | null)[]) {
  const needle = q.toLowerCase()
  return fields.some((f) => (f ?? '').toLowerCase().includes(needle))
}

export function mockSearchUserProfile(
  username: string,
  q: string,
  limit = 40,
  viewer?: { username: string; role?: string } | null,
): ProfileSearchItem[] {
  const term = q.trim()
  if (term.length < 2) return []
  const user = users.find((u) => u.username === username)
  if (!user) return []

  const isOwnerOrStaff =
    !!viewer &&
    (viewer.username === username ||
      (viewer.role && ['moderator', 'superadmin', 'humas'].includes(viewer.role)))

  const out: ProfileSearchItem[] = []

  for (const repo of repos) {
    if (repo.owner.username !== username) continue
    if (repo.visibility === 'private' && !isOwnerOrStaff) continue
    if (
      !matches(
        term,
        repo.name,
        repo.description,
        repo.slug,
        ...(repo.tags ?? []),
      )
    ) {
      continue
    }
    const base = KIND_PATH[repo.kind] ?? 'projects'
    out.push({
      kind: repo.kind as ProfileSearchItem['kind'],
      id: repo.id,
      title: repo.name,
      preview: preview(repo.description),
      href: `/${base}/${repo.slug}`,
      kind_label: repo.kind === 'project' ? 'Proyek' : repo.kind === 'dataset' ? 'Dataset' : 'Model',
      created_at: repo.updated_at,
    })
  }

  for (const post of mockPosts) {
    if (post.author.username !== username) continue
    if (!matches(term, post.body_md)) continue
    out.push({
      kind: 'post',
      id: post.id,
      title: preview(post.body_md, 80),
      preview: preview(post.body_md),
      href: `/${username}?tab=posts`,
      kind_label: 'Postingan',
      created_at: post.created_at,
    })
  }

  for (const thread of threads) {
    if (thread.author.username !== username) continue
    if (!matches(term, thread.title, thread.body_md, ...(thread.tags ?? []))) continue
    out.push({
      kind: 'thread',
      id: thread.id,
      title: thread.title,
      preview: preview(thread.body_md),
      href: `/forum/${thread.id}`,
      kind_label: 'Diskusi',
      created_at: thread.created_at,
    })
  }

  for (const nb of notebooks) {
    if (nb.owner.username !== username) continue
    if (!matches(term, nb.title, nb.description, ...(nb.tags ?? []))) continue
    out.push({
      kind: 'notebook',
      id: nb.id,
      title: nb.title,
      preview: preview(nb.description),
      href: `/notebooks/${nb.id}`,
      kind_label: 'Notebook',
      created_at: '2026-06-01T00:00:00Z',
    })
  }

  return out
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
}
