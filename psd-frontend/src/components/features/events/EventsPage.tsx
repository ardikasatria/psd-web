'use client'

import { EventCard } from '@/components/features/EventCard'
import { EventsSidebar } from '@/components/features/events/EventsSidebar'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageHero, FeaturePageShell, FilterTabs } from '@/components/features/layout'
import { getEvents, getEventStats } from '@/lib/api/events'
import { EventSummary, PaginatedEventSummary } from '@/types/api'
import { ArrowsUpDownIcon, CalendarIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useMemo } from 'react'

const statusTabs = [
  { label: 'Semua', status: '' },
  { label: 'Akan datang', status: 'upcoming' },
  { label: 'Selesai', status: 'past' },
] as const

const typeOptions = [
  { value: '', label: 'Semua jenis' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'bootcamp', label: 'Bootcamp' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'demo_day', label: 'Demo day' },
]

function EventsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const status = searchParams.get('status') ?? ''
  const type = searchParams.get('type') ?? ''
  const sort = (searchParams.get('sort') as 'date' | 'title_asc' | 'title_desc') || 'date'
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined
  const fromDate = searchParams.get('from') ?? ''
  const toDate = searchParams.get('to') ?? ''

  const query = useMemo(
    () => ({
      status: status || undefined,
      type: type || undefined,
      sort,
      year,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      page_size: 48,
    }),
    [status, type, sort, year, fromDate, toDate],
  )

  const stats = useQuery({
    queryKey: ['event-stats'],
    queryFn: getEventStats,
    staleTime: 60_000,
  })

  const yearOptions = stats.data?.years?.length ? stats.data.years : [2026, 2025, 2024]

  const { data, isLoading, isError, error } = useQuery<PaginatedEventSummary>({
    queryKey: ['events', query],
    queryFn: () => getEvents(query),
  })

  const items = useMemo(() => data?.items ?? [], [data?.items])

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      router.replace(`/events?${params.toString()}`)
    },
    [router, searchParams],
  )

  const buildStatusHref = (s: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (s) params.set('status', s)
    else params.delete('status')
    return `/events?${params.toString()}`
  }

  const hasFilters = Boolean(status || type || year || fromDate || toDate || sort !== 'date')

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          <FeaturePageHero
            title="Event"
            subtitle="Webinar, hackathon, bootcamp, dan meetup komunitas sains data Indonesia."
            variant="compact"
          />

          <FilterTabs
            tabs={statusTabs.map((tab) => ({
              label: tab.label,
              href: buildStatusHref(tab.status),
              isActive: status === tab.status,
            }))}
          />

          <div className="rounded-3xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:p-5">
            <div className="flex flex-wrap items-end gap-4">
              <label className="min-w-[140px] flex-1 space-y-1.5">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Jenis</span>
                <select
                  value={type}
                  onChange={(e) => updateParams({ type: e.target.value || null })}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

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
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-700">
              <div className="flex items-center gap-2">
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

              {hasFilters && (
                <button
                  type="button"
                  onClick={() => router.replace('/events')}
                  className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  Reset filter
                </button>
              )}
            </div>

            {type && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-neutral-500">Filter aktif:</span>
                <button
                  type="button"
                  onClick={() => updateParams({ type: null })}
                  className="rounded-full bg-primary-100 px-3 py-0.5 font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                >
                  {typeOptions.find((t) => t.value === type)?.label ?? type} ×
                </button>
              </div>
            )}
          </div>

          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!items.length}
            emptyTitle="Tidak ada event"
            emptyDescription="Coba ubah filter atau tab status untuk menemukan event lain."
            emptyAction={hasFilters ? { label: 'Reset filter', href: '/events' } : undefined}
          >
            <div className="grid gap-5 md:grid-cols-2">
              {items.map((e: EventSummary) => (
                <EventCard key={e.slug} event={e} />
              ))}
            </div>
            {(data?.total ?? 0) > items.length && (
              <p className="mt-4 text-center text-sm text-neutral-500">
                Menampilkan {items.length} dari {data?.total} event
              </p>
            )}
          </QueryState>
        </div>

        <EventsSidebar
          className="w-full shrink-0 lg:sticky lg:top-24 lg:w-80"
          activeType={type || null}
          onTypeClick={(t) => updateParams({ type: t })}
        />
      </div>
    </FeaturePageShell>
  )
}

export function EventsPage() {
  return (
    <Suspense>
      <EventsPageInner />
    </Suspense>
  )
}
