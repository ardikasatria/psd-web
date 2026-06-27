'use client'

import { CompetitionCard } from '@/components/features/CompetitionCard'
import { QueryState } from '@/components/features/QueryState'
import { RepoCard } from '@/components/features/RepoCard'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import { hitToCompetition, hitToRepo } from '@/lib/search/hits'
import { trackSearch } from '@/lib/analytics/track'
import { search } from '@/lib/api/search'
import { CompetitionSummary, RepoSummary, SearchResult } from '@/types/api'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

type FilterType = 'all' | 'repos' | 'competitions'

const filterOptions: { label: string; value: FilterType }[] = [
  { label: 'Semua', value: 'all' },
  { label: 'Aset', value: 'repos' },
  { label: 'Kompetisi', value: 'competitions' },
]

function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get('q') ?? ''
  const typeParam = searchParams.get('type') as FilterType | null
  const [filter, setFilter] = useState<FilterType>(
    typeParam && filterOptions.some((o) => o.value === typeParam) ? typeParam : 'all'
  )

  const apiType = filter === 'all' ? undefined : filter

  const { data, isLoading, isError, error } = useQuery<SearchResult>({
    queryKey: ['search', q, apiType],
    queryFn: () => search(q, apiType),
    enabled: q.trim().length > 0,
  })

  useEffect(() => {
    if (q.trim()) trackSearch(q)
  }, [q])

  const repos = (data?.repos ?? []).map(hitToRepo)
  const competitions = (data?.competitions ?? []).map(hitToCompetition)

  const showRepos = filter === 'all' || filter === 'repos'
  const showComps = filter === 'all' || filter === 'competitions'

  function setFilterAndUrl(next: FilterType) {
    setFilter(next)
    const params = new URLSearchParams()
    params.set('q', q)
    if (next !== 'all') params.set('type', next)
    router.replace(`/search?${params.toString()}`)
  }

  if (!q.trim()) {
    return (
      <FeaturePageShell>
        <FeaturePageHero
          title="Pencarian"
          subtitle="Ketik kata kunci di bilah pencarian header untuk menemukan aset dan kompetisi."
          variant="compact"
        />
      </FeaturePageShell>
    )
  }

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title={`Hasil untuk "${q}"`}
        subtitle="Aset dan kompetisi yang relevan dengan pencarian Anda."
        variant="compact"
      />

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilterAndUrl(opt.value)}
            className={clsx(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              filter === opt.value
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!repos.length && !competitions.length}
        emptyTitle={`Tidak ada hasil untuk "${q}"`}
        emptyDescription="Coba kata kunci lain atau hapus filter tipe."
      >
        {showRepos && repos.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Aset</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {repos.map((repo: RepoSummary) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          </section>
        )}

        {showComps && competitions.length > 0 && (
          <section className={clsx('space-y-4', showRepos && repos.length > 0 && 'mt-10')}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Kompetisi</h2>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {competitions.map((c: CompetitionSummary) => (
                <CompetitionCard key={c.slug} competition={c} />
              ))}
            </div>
          </section>
        )}
      </QueryState>
    </FeaturePageShell>
  )
}

export function SearchPageContent() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  )
}
