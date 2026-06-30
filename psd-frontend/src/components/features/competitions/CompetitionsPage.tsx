'use client'

import { CompetitionCard } from '@/components/features/CompetitionCard'
import { CompetitionConceptSection } from '@/components/features/competitions/CompetitionConceptSection'
import { CompetitionsSidebar } from '@/components/features/competitions/CompetitionsSidebar'
import { CategoryFilter } from '@/components/common/CategoryFilter'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageHero, FeaturePageShell, FilterTabs } from '@/components/features/layout'
import { getCompetitions, getCompetitionStats } from '@/lib/api/competitions'
import { getMyTeams } from '@/lib/api/teams'
import { CompetitionSummary, PaginatedCompetitionSummary } from '@/types/api'
import { ArrowsUpDownIcon, CalendarIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useMemo } from 'react'

const statusTabs = [
  { label: 'Semua', status: '' },
  { label: 'Aktif', status: 'active' },
  { label: 'Akan datang', status: 'upcoming' },
  { label: 'Selesai', status: 'past' },
] as const

function CompetitionsList() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const status = searchParams.get('status') ?? ''
  const category = searchParams.get('category')
  const subcategory = searchParams.get('subcategory')
  const tag = searchParams.get('tag') ?? ''
  const sort = (searchParams.get('sort') as 'date' | 'title_asc' | 'title_desc') || 'date'
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined
  const fromDate = searchParams.get('from') ?? ''
  const toDate = searchParams.get('to') ?? ''
  const teamId = searchParams.get('team_id')

  const myTeams = useQuery({
    queryKey: ['my-teams'],
    queryFn: async () => (await getMyTeams()).items as { id: string; name: string }[],
    enabled: !!teamId,
  })
  const teamName = myTeams.data?.find((t) => t.id === teamId)?.name

  const query = useMemo(
    () => ({
      status: (status || undefined) as 'active' | 'upcoming' | 'past' | undefined,
      category: category ?? undefined,
      subcategory: subcategory ?? undefined,
      tag: tag || undefined,
      sort,
      year,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      page_size: 48,
    }),
    [status, category, subcategory, tag, sort, year, fromDate, toDate],
  )

  const stats = useQuery({
    queryKey: ['competition-stats'],
    queryFn: getCompetitionStats,
    staleTime: 60_000,
  })

  const yearOptions = stats.data?.years?.length ? stats.data.years : [2026, 2025, 2024]

  const { data, isLoading, isError, error } = useQuery<PaginatedCompetitionSummary>({
    queryKey: ['competitions', query],
    queryFn: () => getCompetitions(query),
  })

  const items = useMemo(() => data?.items ?? [], [data?.items])

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      router.replace(`/competitions?${params.toString()}`)
    },
    [router, searchParams],
  )

  const setCategoryFilter = (cat: string | null, sub: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (cat) params.set('category', cat)
    else params.delete('category')
    if (sub) params.set('subcategory', sub)
    else params.delete('subcategory')
    router.replace(`/competitions?${params.toString()}`)
  }

  const buildStatusHref = (s: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (s) params.set('status', s)
    else params.delete('status')
    return `/competitions?${params.toString()}`
  }

  const hasFilters = Boolean(status || category || subcategory || tag || year || fromDate || toDate || sort !== 'date')

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          <FeaturePageHero
            title="Kompetisi"
            subtitle="Ikuti kompetisi sains data dengan konteks lokal Indonesia. Tunjukkan kemampuan Anda dan menangkan hadiah."
            variant="compact"
          />

          <CompetitionConceptSection />

          {teamId && teamName && (
            <div className="rounded-2xl border border-primary-200/80 bg-primary-50/80 px-4 py-3 text-sm text-primary-900 dark:border-primary-800/50 dark:bg-primary-950/30 dark:text-primary-100">
              Mode tim: <strong>{teamName}</strong>. Buka kompetisi aktif, lalu pada tab Submission pilih &quot;Submit
              sebagai&quot; → tim ini.
            </div>
          )}

          <div id="competition-catalog" className="space-y-6 scroll-mt-28">
          <FilterTabs
            tabs={statusTabs.map((tab) => ({
              label: tab.label,
              href: buildStatusHref(tab.status),
              isActive: status === tab.status,
            }))}
          />

          <div className="rounded-3xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CategoryFilter
                category={category}
                subcategory={subcategory}
                onChange={setCategoryFilter}
                className="min-w-0 sm:flex-1"
              />

              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                <ArrowsUpDownIcon className="size-4 text-neutral-400" aria-hidden />
                <span className="text-xs font-medium text-neutral-500">Urutkan:</span>
                <div className="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
                  {(
                    [
                      { key: 'date', label: 'Tanggal' },
                      { key: 'title_asc', label: 'A–Z' },
                      { key: 'title_desc', label: 'Z–A' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => updateParams({ sort: opt.key === 'date' ? null : opt.key })}
                      className={clsx(
                        'rounded-lg px-3 py-1.5 text-xs font-medium motion-safe:transition-colors',
                        sort === opt.key
                          ? 'bg-white text-primary-600 shadow-sm dark:bg-neutral-800 dark:text-primary-400'
                          : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-neutral-100 pt-4 dark:border-neutral-700">
              <label className="min-w-[120px] space-y-1.5">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Tahun</span>
                <select
                  value={year ?? ''}
                  onChange={(e) => updateParams({ year: e.target.value || null })}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                >
                  <option value="">Semua tahun</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-[150px] space-y-1.5">
                <span className="flex items-center gap-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <CalendarIcon className="size-3.5" />
                  Dari tanggal
                </span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => updateParams({ from: e.target.value || null })}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                />
              </label>

              <label className="min-w-[150px] space-y-1.5">
                <span className="flex items-center gap-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <CalendarIcon className="size-3.5" />
                  Sampai tanggal
                </span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => updateParams({ to: e.target.value || null })}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                />
              </label>

              {hasFilters && (
                <button
                  type="button"
                  onClick={() => router.replace('/competitions')}
                  className="ms-auto text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  Reset filter
                </button>
              )}
            </div>

            {tag && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-neutral-500">Filter:</span>
                <button
                  type="button"
                  onClick={() => updateParams({ tag: null })}
                  className="rounded-full bg-primary-100 px-3 py-0.5 font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                >
                  #{tag} ×
                </button>
              </div>
            )}
          </div>

          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!items.length}
            emptyTitle="Tidak ada kompetisi"
            emptyDescription="Coba ubah filter atau tab status untuk menemukan kompetisi lain."
            emptyAction={hasFilters ? { label: 'Reset filter', href: '/competitions' } : undefined}
          >
            <div className="grid gap-5 md:grid-cols-2">
              {items.map((c: CompetitionSummary) => (
                <CompetitionCard key={c.slug} competition={c} teamId={teamId} />
              ))}
            </div>
            {(data?.total ?? 0) > items.length && (
              <p className="mt-4 text-center text-sm text-neutral-500">
                Menampilkan {items.length} dari {data?.total} kompetisi
              </p>
            )}
          </QueryState>
          </div>
        </div>

        <CompetitionsSidebar
          className="w-full shrink-0 lg:sticky lg:top-24 lg:w-80"
          activeTag={tag || null}
          onTagClick={(t) => updateParams({ tag: t })}
        />
      </div>
    </FeaturePageShell>
  )
}

export function CompetitionsPage() {
  return (
    <Suspense>
      <CompetitionsList />
    </Suspense>
  )
}
