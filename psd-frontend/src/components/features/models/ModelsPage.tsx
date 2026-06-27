'use client'

import { modelGradient } from '@/components/common/featureGradients'
import { pageHighlightStripClass } from '@/components/common/SidebarStatTile'
import { ModelCard } from '@/components/features/models/ModelCard'
import { ModelConceptSection } from '@/components/features/models/ModelConceptSection'
import { ModelsLearnSidebar } from '@/components/features/models/ModelsLearnSidebar'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { useMe } from '@/lib/api/dashboard'
import { getRepos } from '@/lib/api/repos'
import { PaginatedRepoSummary, RepoSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import {
  BeakerIcon,
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
  { id: 'forecasting', label: 'Forecasting' },
  { id: 'transformer', label: 'Transformer' },
  { id: 'umkm', label: 'UMKM' },
] as const

function matchesTag(model: RepoSummary, tag: string) {
  if (!tag) return true
  const hay = `${model.name} ${model.description} ${model.tags.join(' ')} ${model.category?.slug ?? ''}`.toLowerCase()
  return hay.includes(tag)
}

export function ModelsPage() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const me = useMe()

  const { data, isLoading, isError, error } = useQuery<PaginatedRepoSummary>({
    queryKey: ['models', search],
    queryFn: () => getRepos('model', search ? { q: search } : {}),
  })

  const items = data?.items ?? []

  const filtered = useMemo(() => items.filter((m) => matchesTag(m, tagFilter)), [items, tagFilter])

  const featured = items.filter((m) => m.featured)
  const popular = [...items].sort((a, b) => b.downloads - a.downloads)

  const scrollToCatalog = useCallback(() => {
    document.getElementById('model-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <ModelsLearnSidebar
          className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72"
          onScrollToCatalog={scrollToCatalog}
        />

        <div className="order-1 min-w-0 flex-1 space-y-8 lg:order-2">
          <div className={modelGradient.hero}>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                  <SparklesIcon className="size-3.5" aria-hidden />
                  Katalog model terbuka
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Model
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Jelajahi baseline, checkpoint, dan artefak inferensi dari komunitas PSD — bandingkan metrik,
                  fork untuk kompetisi, dan publikasikan model Anda.
                </p>
              </div>
              {me.data?.user ? (
                <ButtonPrimary href="/models/new" className="shrink-0">
                  <PlusIcon className="size-4" aria-hidden />
                  Publikasikan model
                </ButtonPrimary>
              ) : (
                <ButtonPrimary href="/login?next=/models/new" className="shrink-0">
                  Masuk untuk publikasi
                </ButtonPrimary>
              )}
            </div>
            <div
              className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-600/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 start-1/3 size-48 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-600/10"
              aria-hidden
            />
          </div>

          <ModelConceptSection />

          {featured.length > 0 && !search && !tagFilter && (
            <section className={pageHighlightStripClass}>
              <div className="mb-4 flex items-center gap-2">
                <SparklesIcon className="size-5 text-violet-600 dark:text-violet-400" aria-hidden />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Model featured</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {featured.slice(0, 4).map((m) => (
                  <Link
                    key={m.id}
                    href={`/models/${m.owner.username}/${m.name}`}
                    className="flex w-64 shrink-0 flex-col rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/95"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                      Featured
                    </span>
                    <p className="mt-2 line-clamp-2 font-medium text-neutral-900 dark:text-neutral-100">{m.name}</p>
                    <p className="mt-2 text-xs text-neutral-500">@{m.owner.username}</p>
                    {m.metrics_preview?.accuracy != null && (
                      <p className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        {(m.metrics_preview.accuracy * 100).toFixed(1)}% akurasi
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {popular.length > 0 && !search && !tagFilter && (
            <section className={pageHighlightStripClass}>
              <div className="mb-4 flex items-center gap-2">
                <BeakerIcon className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Populer di komunitas</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {popular.slice(0, 3).map((m) => (
                  <Link
                    key={m.id}
                    href={`/models/${m.owner.username}/${m.name}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-white dark:border-neutral-600 dark:bg-neutral-800/90 dark:text-neutral-200"
                  >
                    {m.name}
                    <span className="text-xs text-neutral-500">{m.downloads.toLocaleString('id-ID')} unduhan</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div id="model-catalog" className="scroll-mt-28 space-y-4">
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
                placeholder="Cari model, framework, atau topik…"
                className="!rounded-2xl !py-3 !ps-12 !pe-10 text-base shadow-sm ring-1 ring-primary-100/80 dark:ring-primary-900/40"
                aria-label="Cari model"
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
            emptyTitle="Belum ada model"
            emptyDescription={
              search || tagFilter
                ? 'Tidak ada model yang cocok dengan filter Anda.'
                : 'Jadilah yang pertama mempublikasikan model baseline ke komunitas.'
            }
            skeletonColumns={2}
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((model: RepoSummary, i) => (
                <ModelCard key={model.id} model={model} index={i} />
              ))}
            </div>
          </QueryState>

          {!me.data?.user && (
            <div className="rounded-3xl border border-dashed border-violet-300/70 bg-violet-50/40 px-6 py-8 text-center dark:border-violet-800 dark:bg-violet-950/20">
              <BeakerIcon className="mx-auto size-8 text-violet-500" aria-hidden />
              <p className="mt-3 font-semibold text-neutral-900 dark:text-neutral-100">Punya model worth sharing?</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Masuk dan publikasikan checkpoint atau baseline — bantu praktisi lain mulai lebih cepat.
              </p>
              <Link
                href="/login?next=/models/new"
                className="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Publikasikan model pertama
              </Link>
            </div>
          )}
        </div>
      </div>
    </FeaturePageShell>
  )
}
