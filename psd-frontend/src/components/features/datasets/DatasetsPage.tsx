'use client'

import { pageCtaPanelClass, pageHighlightStripClass } from '@/components/common/SidebarStatTile'
import { DatasetCard } from '@/components/features/datasets/DatasetCard'
import { DatasetConceptSection } from '@/components/features/datasets/DatasetConceptSection'
import { DatasetsLearnSidebar } from '@/components/features/datasets/DatasetsLearnSidebar'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { useMe } from '@/lib/api/dashboard'
import { getRepos } from '@/lib/api/repos'
import { PaginatedRepoSummary, RepoSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import {
  CubeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

const TAG_FILTERS = [
  { id: '', label: 'Semua' },
  { id: 'nlp', label: 'NLP' },
  { id: 'computer-vision', label: 'CV' },
  { id: 'tabular', label: 'Tabular' },
  { id: 'umkm', label: 'UMKM' },
  { id: 'synthetic', label: 'Sintesis' },
] as const

function matchesTag(dataset: RepoSummary, tag: string) {
  if (!tag) return true
  if (tag === 'synthetic') return dataset.synthetic === true
  const hay = `${dataset.name} ${dataset.description} ${dataset.tags.join(' ')} ${dataset.category?.slug ?? ''}`.toLowerCase()
  return hay.includes(tag)
}

export function DatasetsPage() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const me = useMe()

  const { data, isLoading, isError, error } = useQuery<PaginatedRepoSummary>({
    queryKey: ['datasets', search],
    queryFn: () => getRepos('dataset', search ? { q: search } : {}),
  })

  const items = data?.items ?? []

  const filtered = useMemo(() => items.filter((d) => matchesTag(d, tagFilter)), [items, tagFilter])

  const featured = items.filter((d) => d.featured)
  const synthetic = items.filter((d) => d.synthetic)
  const popular = [...items].sort((a, b) => b.downloads - a.downloads)

  const scrollToCatalog = useCallback(() => {
    document.getElementById('dataset-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <DatasetsLearnSidebar
          className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72"
          onScrollToCatalog={scrollToCatalog}
        />

        <div className="order-1 min-w-0 flex-1 space-y-8 lg:order-2">
          <div className="relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-sky-50 via-indigo-50/70 to-primary-50/60 p-8 dark:border-primary-900/40 dark:from-sky-950/30 dark:via-neutral-900 dark:to-indigo-950/25 sm:p-10">
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                  <SparklesIcon className="size-3.5" aria-hidden />
                  Katalog data terbuka
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Dataset
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Jelajahi data NLP, citra, tabular, dan survei UMKM dari komunitas PSD — unduh untuk EDA,
                  latih model, atau ikut kompetisi.
                </p>
              </div>
              {me.data?.user ? (
                <ButtonPrimary href="/datasets/new" className="shrink-0">
                  <PlusIcon className="size-4" aria-hidden />
                  Publikasikan dataset
                </ButtonPrimary>
              ) : (
                <ButtonPrimary href="/login?next=/datasets/new" className="shrink-0">
                  Masuk untuk publikasi
                </ButtonPrimary>
              )}
            </div>
            <div
              className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-600/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 start-1/3 size-48 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-600/10"
              aria-hidden
            />
          </div>

          <DatasetConceptSection />

          {featured.length > 0 && !search && !tagFilter && (
            <section className={pageHighlightStripClass}>
              <div className="mb-4 flex items-center gap-2">
                <SparklesIcon className="size-5 text-sky-600 dark:text-sky-400" aria-hidden />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Dataset featured</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {featured.slice(0, 4).map((d) => (
                  <Link
                    key={d.id}
                    href={`/datasets/${d.owner.username}/${d.name}`}
                    className="flex w-64 shrink-0 flex-col rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/95"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                      Featured
                    </span>
                    <p className="mt-2 line-clamp-2 font-medium text-neutral-900 dark:text-neutral-100">{d.name}</p>
                    <p className="mt-2 text-xs text-neutral-500">@{d.owner.username}</p>
                    {d.dataset_preview?.rows != null && (
                      <p className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        {d.dataset_preview.rows >= 1000
                          ? `${(d.dataset_preview.rows / 1000).toFixed(0)}K baris`
                          : `${d.dataset_preview.rows} baris`}
                        {d.dataset_preview.format ? ` · ${d.dataset_preview.format}` : ''}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {synthetic.length > 0 && !search && !tagFilter && (
            <section className={pageHighlightStripClass}>
              <div className="mb-4 flex items-center gap-2">
                <CubeIcon className="size-5 text-amber-600 dark:text-amber-400" aria-hidden />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Data sintesis Ruang Ide</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {synthetic.map((d) => (
                  <Link
                    key={d.id}
                    href={`/datasets/${d.owner.username}/${d.name}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-white dark:border-neutral-600 dark:bg-neutral-800/90 dark:text-neutral-200"
                  >
                    {d.name}
                    <span className="text-xs text-amber-600 dark:text-amber-400">Sintesis</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {popular.length > 0 && !search && !tagFilter && (
            <section className={pageHighlightStripClass}>
              <div className="mb-4 flex items-center gap-2">
                <CubeIcon className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Populer di komunitas</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {popular.slice(0, 3).map((d) => (
                  <Link
                    key={d.id}
                    href={`/datasets/${d.owner.username}/${d.name}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-white dark:border-neutral-600 dark:bg-neutral-800/90 dark:text-neutral-200"
                  >
                    {d.name}
                    <span className="text-xs text-neutral-500">{d.downloads.toLocaleString('id-ID')} unduhan</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div id="dataset-catalog" className="scroll-mt-28 space-y-4">
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault()
                setSearch(q.trim())
              }}
            >
              <MagnifyingGlassIcon
                className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari dataset, format, atau topik…"
                className="!rounded-2xl !py-3 !ps-12 !pe-10 text-base shadow-sm ring-1 ring-primary-100/80 dark:ring-primary-900/40"
                aria-label="Cari dataset"
              />
              {(q || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setQ('')
                    setSearch('')
                  }}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                  aria-label="Hapus pencarian"
                >
                  <XMarkIcon className="size-4" />
                </button>
              )}
            </form>

            <div className="flex flex-wrap gap-2">
              {TAG_FILTERS.map((f) => (
                <button
                  key={f.id || 'all'}
                  type="button"
                  onClick={() => setTagFilter(f.id)}
                  className={clsx(
                    'rounded-full px-4 py-2 text-sm font-medium transition',
                    tagFilter === f.id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!filtered.length}
            emptyTitle="Belum ada dataset"
            emptyDescription={
              search || tagFilter
                ? 'Tidak ada dataset yang cocok dengan filter Anda.'
                : 'Jadilah yang pertama mempublikasikan dataset ke komunitas.'
            }
            skeletonColumns={2}
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((dataset: RepoSummary, i) => (
                <DatasetCard key={dataset.id} dataset={dataset} index={i} />
              ))}
            </div>
          </QueryState>

          {!me.data?.user && (
            <div className="rounded-3xl border border-dashed border-sky-300/70 bg-sky-50/40 px-6 py-8 text-center dark:border-sky-800 dark:bg-sky-950/20">
              <CubeIcon className="mx-auto size-8 text-sky-500" aria-hidden />
              <p className="mt-3 font-semibold text-neutral-900 dark:text-neutral-100">Punya dataset worth sharing?</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Masuk dan publikasikan data terbuka — bantu praktisi lain mulai eksplorasi lebih cepat.
              </p>
              <Link
                href="/login?next=/datasets/new"
                className="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Publikasikan dataset pertama
              </Link>
            </div>
          )}
        </div>
      </div>
    </FeaturePageShell>
  )
}
