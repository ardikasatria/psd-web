'use client'

import { QueryState } from '@/components/features/QueryState'
import { SearchHitRow } from '@/components/features/search/SearchHitRow'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import { universalSearch } from '@/lib/api/search'
import { KIND_ORDER, kindMeta } from '@/lib/search/kindMeta'
import { trackSearch } from '@/lib/analytics/track'
import type { SearchHit, SearchKind, SearchResponse } from '@/types/api'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

type TabValue = 'all' | SearchKind

const TABS: { label: string; value: TabValue }[] = [
  { label: 'Semua', value: 'all' },
  ...KIND_ORDER.map((k) => ({ label: kindMeta(k).label, value: k })),
]

function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get('q') ?? ''
  const typeParam = searchParams.get('type') as TabValue | null
  const [tab, setTab] = useState<TabValue>(
    typeParam && TABS.some((t) => t.value === typeParam) ? typeParam : 'all',
  )

  useEffect(() => {
    const next = typeParam && TABS.some((t) => t.value === typeParam) ? typeParam : 'all'
    setTab(next)
  }, [typeParam])

  const apiType = tab === 'all' ? undefined : kindMeta(tab).typeParam

  const { data, isLoading, isError, error } = useQuery<SearchResponse>({
    queryKey: ['universal-search', q, apiType],
    queryFn: () => universalSearch(q, { type: apiType, limit: 60 }),
    enabled: q.trim().length > 0 || tab !== 'all',
  })

  useEffect(() => {
    if (q.trim()) trackSearch(q)
  }, [q])

  function selectTab(next: TabValue) {
    setTab(next)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (next !== 'all') params.set('type', kindMeta(next).typeParam)
    router.replace(`/search${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const results = data?.results ?? []

  // Untuk tab "Semua", tampilkan terkelompok per kategori; untuk tab tipe, daftar datar.
  const groupedForAll = useMemo(() => {
    if (tab !== 'all') return null
    const map: Record<string, SearchHit[]> = {}
    for (const hit of results) {
      if (!map[hit.kind]) map[hit.kind] = []
      map[hit.kind].push(hit)
    }
    return map
  }, [tab, results])

  const showBrowseHint = !q.trim() && tab === 'all'

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title={q.trim() ? `Hasil untuk "${q}"` : 'Pencarian Universal'}
        subtitle={
          q.trim()
            ? `${data?.total ?? 0} hasil lintas akun, organisasi, aset, kompetisi, event, tim, dan forum.`
            : 'Temukan akun, organisasi, aset, kompetisi, event, tim, dan diskusi forum dalam satu tempat.'
        }
        variant="compact"
      />

      {/* Tab tipe */}
      <div
        className="flex flex-wrap gap-2 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-1.5 dark:border-neutral-700 dark:bg-neutral-800/50"
        role="tablist"
        aria-label="Filter tipe pencarian"
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => selectTab(t.value)}
            className={clsx(
              'rounded-xl px-3.5 py-1.5 text-sm font-medium motion-safe:transition-colors',
              tab === t.value
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-white hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showBrowseHint ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 py-16 text-center dark:border-neutral-700">
          <MagnifyingGlassIcon className="size-10 text-neutral-300 dark:text-neutral-600" aria-hidden />
          <p className="mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Ketik kata kunci untuk mulai mencari
          </p>
          <p className="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
            Atau pilih tab tipe di atas untuk menjelajah kategori berdasarkan popularitas.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!results.length}
            emptyTitle={q.trim() ? `Tidak ada hasil untuk "${q}"` : 'Belum ada yang bisa ditampilkan'}
            emptyDescription="Coba kata kunci lain, gunakan operator seperti type:, @, #, atau owner:, atau ganti tab tipe."
          >
            {tab === 'all' && groupedForAll ? (
              <div className="space-y-8">
                {KIND_ORDER.map((kind) => {
                  const hits = groupedForAll[kind]
                  if (!hits?.length) return null
                  const meta = kindMeta(kind)
                  return (
                    <section key={kind}>
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                          {meta.label}
                        </h2>
                        <button
                          type="button"
                          onClick={() => selectTab(kind)}
                          className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                        >
                          Lihat semua {meta.label.toLowerCase()}
                        </button>
                      </div>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {hits.slice(0, 6).map((hit) => (
                          <li key={`${hit.kind}-${hit.id}`}>
                            <Link
                              href={hit.url}
                              className="block rounded-xl border border-neutral-200/80 bg-white motion-safe:transition-colors hover:border-primary-300 hover:bg-primary-50/40 dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:border-primary-700 dark:hover:bg-primary-950/20"
                            >
                              <SearchHitRow hit={hit} showBadge={false} />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {results.map((hit) => (
                  <li key={`${hit.kind}-${hit.id}`}>
                    <Link
                      href={hit.url}
                      className="block rounded-xl border border-neutral-200/80 bg-white motion-safe:transition-colors hover:border-primary-300 hover:bg-primary-50/40 dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:border-primary-700 dark:hover:bg-primary-950/20"
                    >
                      <SearchHitRow hit={hit} showBadge={false} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </div>
      )}
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
