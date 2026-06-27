import { CompetitionSummary, RepoKind, RepoSummary } from '@/types/api'

export const kindPath: Record<string, string> = {
  project: 'projects',
  dataset: 'datasets',
  model: 'models',
}

export function hitToRepo(hit: Record<string, unknown>): RepoSummary {
  const slug = String(hit.slug ?? '')
  const ownerUsername = String(hit.owner ?? slug.split('/')[0] ?? 'unknown')
  return {
    id: String(hit.id ?? slug),
    slug,
    kind: (hit.kind as RepoKind) ?? 'project',
    owner: { username: ownerUsername, type: 'user', avatar_url: null },
    name: String(hit.name ?? slug.split('/')[1] ?? ''),
    description: String(hit.description ?? ''),
    tags: Array.isArray(hit.tags) ? (hit.tags as string[]) : [],
    likes: Number(hit.likes ?? 0),
    downloads: Number(hit.downloads ?? 0),
    visibility: (hit.visibility as 'public' | 'private') ?? 'public',
    updated_at: String(hit.updated_at ?? new Date().toISOString()),
  }
}

export function hitToCompetition(hit: Record<string, unknown>): CompetitionSummary {
  return {
    slug: String(hit.slug ?? ''),
    title: String(hit.title ?? ''),
    sponsor: hit.sponsor ? String(hit.sponsor) : null,
    status: (hit.status as CompetitionSummary['status']) ?? 'active',
    metric: String(hit.metric ?? ''),
    participants: Number(hit.participants ?? 0),
    prize_pool: hit.prize_pool ? String(hit.prize_pool) : null,
    starts_at: String(hit.starts_at ?? new Date().toISOString()),
    ends_at: String(hit.ends_at ?? new Date().toISOString()),
    cover_url: hit.cover_url ? String(hit.cover_url) : null,
  }
}

export function repoHref(repo: RepoSummary): string {
  return `/${kindPath[repo.kind]}/${repo.owner.username}/${repo.name}`
}

export function competitionHref(c: CompetitionSummary): string {
  return `/competitions/${c.slug}`
}
