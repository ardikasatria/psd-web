'use client'

import { heroGradient } from '@/components/common/featureGradients'
import { PathCard } from '@/components/features/PathCard'
import { PathsSidebar } from '@/components/features/learn/PathsSidebar'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { getLearningPaths } from '@/lib/api/learn'
import { LearningPathSummary, PaginatedLearningPathSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import {
  AcademicCapIcon,
  MagnifyingGlassIcon,
  MapIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'

const FOCUS_FILTERS = [
  { id: '', label: 'Semua' },
  { id: 'data', label: 'Data Scientist' },
  { id: 'nlp', label: 'NLP' },
  { id: 'umkm', label: 'UMKM' },
] as const

function matchesFocus(path: LearningPathSummary, focus: string) {
  if (!focus) return true
  const hay = `${path.slug} ${path.title} ${path.description}`.toLowerCase()
  if (focus === 'data') return hay.includes('data') || hay.includes('scientist')
  if (focus === 'nlp') return hay.includes('nlp')
  if (focus === 'umkm') return hay.includes('umkm')
  return true
}

export function PathsPage() {
  const [search, setSearch] = useState('')
  const [focus, setFocus] = useState('')

  const { data, isLoading, isError, error } = useQuery<PaginatedLearningPathSummary>({
    queryKey: ['learning-paths'],
    queryFn: () => getLearningPaths(),
  })

  const paths = data?.items ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return paths.filter((p) => {
      if (!matchesFocus(p, focus)) return false
      if (!q) return true
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
      )
    })
  }, [paths, search, focus])

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <PathsSidebar
          className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72"
          paths={paths}
        />

        <div className="order-1 min-w-0 flex-1 space-y-6 lg:order-2">
          <div className={heroGradient.learn}>
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="relative z-10 max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                  <MapIcon className="size-3.5" aria-hidden />
                  Belajar → Buktikan → Berpeluang
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Jalur belajar
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Ikuti jalur terstruktur menuju keahlian spesifik — dari fondasi hingga spesialisasi.
                  Setiap jalur menghubungkan kursus pilihan dalam urutan yang produktif dan nyaman diikuti.
                </p>
              </div>
              <ButtonPrimary href="/learn" className="shrink-0">
                <AcademicCapIcon className="size-4" aria-hidden />
                Jelajahi kursus
              </ButtonPrimary>
            </div>
            <div
              className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-primary-400/10 blur-3xl dark:bg-primary-600/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 start-1/3 size-48 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-600/10"
              aria-hidden
            />
          </div>

          <div className="relative">
            <MagnifyingGlassIcon
              className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari jalur belajar…"
              className="!rounded-2xl !py-3 !ps-12 !pe-10 text-base shadow-sm ring-1 ring-primary-100/80 dark:ring-primary-900/40"
              aria-label="Cari jalur belajar"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                aria-label="Hapus pencarian"
              >
                <XMarkIcon className="size-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="inline-flex flex-wrap rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800"
              role="tablist"
              aria-label="Filter fokus jalur"
            >
              {FOCUS_FILTERS.map((f) => (
                <button
                  key={f.id || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={focus === f.id}
                  onClick={() => setFocus(f.id)}
                  className={clsx(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    focus === f.id
                      ? 'bg-white text-primary-700 shadow-sm dark:bg-neutral-700 dark:text-primary-300'
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-neutral-500">
              {search.trim() || focus ? `${filtered.length} jalur` : `${paths.length} jalur tersedia`}
            </p>
          </div>

          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!isLoading && !isError && paths.length > 0 && filtered.length === 0}
            emptyTitle="Jalur tidak ditemukan"
            emptyDescription="Coba kata kunci atau filter fokus lain."
            skeletonColumns={2}
          >
            {paths.length === 0 && !isLoading ? (
              <div className="rounded-2xl border border-dashed border-primary-300/70 bg-primary-50/30 p-10 text-center dark:border-primary-800 dark:bg-primary-950/20">
                <MapIcon className="mx-auto size-12 text-primary-400 dark:text-primary-500" aria-hidden />
                <p className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Jalur belajar segera hadir
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
                  Sementara itu, jelajahi kursus individual di katalog Belajar.
                </p>
                <ButtonPrimary href="/learn" className="mt-6">
                  Ke katalog Belajar
                </ButtonPrimary>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {filtered.map((p: LearningPathSummary) => (
                  <PathCard key={p.slug} path={p} />
                ))}
              </div>
            )}
          </QueryState>

          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Butuh fleksibilitas penuh?{' '}
            <Link href="/learn" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Ambil kursus satuan di Belajar
            </Link>
            .
          </p>
        </div>
      </div>
    </FeaturePageShell>
  )
}
