'use client'

import { heroGradient } from '@/components/common/featureGradients'
import { pageCtaPanelClass } from '@/components/common/SidebarStatTile'
import { OpenHubButton } from '@/components/features/notebooks/OpenHubButton'
import { NotebookConceptSection } from '@/components/features/notebooks/NotebookConceptSection'
import { NotebooksLearnSidebar } from '@/components/features/notebooks/NotebooksLearnSidebar'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { useMe } from '@/lib/api/dashboard'
import { getNotebooks } from '@/lib/api/notebooks'
import { NotebookSummary, PaginatedNotebookSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import {
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
  { id: 'tutorial', label: 'Tutorial' },
  { id: 'nlp', label: 'NLP' },
  { id: 'cv', label: 'CV' },
  { id: 'tabular', label: 'Tabular' },
  { id: 'umkm', label: 'UMKM' },
] as const

function matchesTag(nb: NotebookSummary, tag: string) {
  if (!tag) return true
  const hay = `${nb.title} ${nb.description_preview ?? ''} ${nb.tags.join(' ')} ${nb.category?.slug ?? ''}`.toLowerCase()
  return hay.includes(tag)
}

export function NotebooksPage() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const me = useMe()

  const { data, isLoading, isError, error } = useQuery<PaginatedNotebookSummary>({
    queryKey: ['notebooks', search],
    queryFn: () => getNotebooks(search ? { q: search } : {}),
  })

  const items = data?.items ?? []

  const filtered = useMemo(() => items.filter((nb) => matchesTag(nb, tagFilter)), [items, tagFilter])

  const scrollToCatalog = useCallback(() => {
    document.getElementById('notebook-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <NotebooksLearnSidebar
          className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72"
          onScrollToCatalog={scrollToCatalog}
        />

        <div className="order-1 min-w-0 flex-1 space-y-8 lg:order-2">
          <div className={heroGradient.notebook}>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                  <SparklesIcon className="size-3.5" aria-hidden />
                  Ruang praktik kode
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Notebook
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Katalog notebook praktik PSD — jalankan di JupyterHub terintegrasi, akses dataset via{' '}
                  <code className="rounded bg-white/60 px-1 dark:bg-neutral-900/60">psd://</code>, dan bagikan workflow
                  ke komunitas.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <OpenHubButton />
                {me.data?.user ? (
                  <ButtonPrimary href="/notebooks/new" outline>
                    <PlusIcon className="size-4" aria-hidden />
                    Bagikan notebook
                  </ButtonPrimary>
                ) : (
                  <ButtonPrimary href="/login?next=/notebooks/new" outline>
                    Masuk untuk berbagi
                  </ButtonPrimary>
                )}
              </div>
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

          <NotebookConceptSection />

          <div id="notebook-catalog" className="scroll-mt-28 space-y-4">
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
                placeholder="Cari notebook, tag, atau topik…"
                className="!rounded-2xl !py-3 !ps-12 !pe-10 text-base shadow-sm ring-1 ring-primary-100/80 dark:ring-primary-900/40"
                aria-label="Cari notebook"
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
            emptyTitle="Belum ada notebook"
            emptyDescription={
              search || tagFilter
                ? 'Tidak ada notebook yang cocok dengan filter Anda.'
                : 'Jadilah yang pertama membagikan notebook referensi ke komunitas.'
            }
            skeletonColumns={2}
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((nb: NotebookSummary, i) => (
                <NotebookCard key={nb.id} notebook={nb} index={i} />
              ))}
            </div>
          </QueryState>

          {!me.data?.user && (
            <div className={pageCtaPanelClass}>
              <SparklesIcon className="mx-auto size-8 text-primary-500" aria-hidden />
              <p className="mt-3 font-semibold text-neutral-900 dark:text-neutral-100">Punya workflow worth sharing?</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Masuk dan bagikan notebook referensi — bantu praktisi lain naik skill lebih cepat.
              </p>
              <Link href="/login?next=/notebooks/new" className="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                Bagikan notebook pertama
              </Link>
            </div>
          )}
        </div>
      </div>
    </FeaturePageShell>
  )
}
