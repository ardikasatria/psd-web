'use client'

import { RepoCard } from '@/components/features/RepoCard'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import { getRepos } from '@/lib/api/repos'
import { RepoKind, RepoSummary } from '@/types/api'
import { useQuery } from '@tanstack/react-query'
import { Suspense } from 'react'

const kinds: RepoKind[] = ['project', 'dataset', 'model']

function TagList({ tag }: { tag: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['repos', 'tag', tag],
    queryFn: async () => {
      const pages = await Promise.all(
        kinds.map((kind) => getRepos(kind, { tags: tag, sort: '-updated_at', page_size: 50 }))
      )
      return pages.flatMap((p) => p.items)
    },
  })

  const items = data ?? []

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title={`Tag: ${tag}`}
        subtitle="Aset dengan tag ini dari proyek, dataset, dan model."
        variant="compact"
      />

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!items.length}
        emptyTitle="Tidak ada aset dengan tag ini"
        emptyDescription="Coba tag lain atau jelajahi semua aset."
        emptyAction={{ label: 'Jelajahi aset', href: '/explore' }}
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((repo: RepoSummary) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      </QueryState>
    </FeaturePageShell>
  )
}

export function TagPageContent({ tag }: { tag: string }) {
  return (
    <Suspense>
      <TagList tag={tag} />
    </Suspense>
  )
}
