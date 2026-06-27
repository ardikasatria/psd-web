'use client'

import { QueryState } from '@/components/features/QueryState'
import { CreatePipelineDialog } from '@/components/features/factory/CreatePipelineDialog'
import { FactoryConceptSection } from '@/components/features/factory/FactoryConceptSection'
import { FactorySidebar } from '@/components/features/factory/FactorySidebar'
import { PipelineCard } from '@/components/features/factory/PipelineCard'
import { factoryGradient } from '@/components/common/featureGradients'
import { FeaturePageShell } from '@/components/features/layout'
import { listPipelines } from '@/lib/api/factory'
import { useAuth } from '@/lib/auth/useAuth'
import type { PaginatedPipelineSummary, PipelineSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import {
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Suspense, useMemo, useState } from 'react'

function PipelinesPageInner() {
  const { isLoggedIn } = useAuth()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, error } = useQuery<PaginatedPipelineSummary>({
    queryKey: ['factory-pipelines', page],
    queryFn: () => listPipelines({ page }),
    enabled: isLoggedIn,
  })

  const items = data?.items ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (p: PipelineSummary) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    )
  }, [items, search])

  if (!isLoggedIn) {
    return (
      <FeaturePageShell>
        <div className="mx-auto max-w-lg rounded-3xl border border-neutral-200/80 bg-white p-10 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <Cog6ToothIcon className="mx-auto size-12 text-neutral-300 dark:text-neutral-600" aria-hidden />
          <h1 className="mt-4 text-xl font-bold text-neutral-900 dark:text-neutral-50">Pabrik Data</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Masuk untuk mengelola sumber data dan pipeline ETL Anda.
          </p>
          <ButtonPrimary href="/login?next=/factory/pipelines" className="mt-6">
            Masuk
          </ButtonPrimary>
        </div>
      </FeaturePageShell>
    )
  }

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <FactorySidebar
          className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72"
          onCreateClick={() => setCreateOpen(true)}
        />

        <div className="order-1 min-w-0 flex-1 space-y-8 lg:order-2">
          <div className={factoryGradient.hero}>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  <Cog6ToothIcon className="size-3.5" aria-hidden />
                  Pipeline ETL
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Pabrik Data
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Susun pipeline dari sumber dataset PSD — validasi DAG bronze/silver/gold sebelum eksekusi di rilis
                  berikutnya.
                </p>
              </div>
              <ButtonPrimary type="button" onClick={() => setCreateOpen(true)} className="shrink-0">
                <PlusIcon className="size-4" aria-hidden />
                Pipeline baru
              </ButtonPrimary>
            </div>
          </div>

          <FactoryConceptSection />

          <div className="space-y-4">
            <div className="relative">
              <MagnifyingGlassIcon
                className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari pipeline…"
                className="!rounded-2xl !py-3 !ps-12 !pe-10 text-base shadow-sm ring-1 ring-primary-100/80 dark:ring-primary-900/40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  aria-label="Hapus pencarian"
                >
                  <XMarkIcon className="size-4" />
                </button>
              )}
            </div>
          </div>

          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!filtered.length}
            emptyTitle="Belum ada pipeline"
            emptyDescription={
              search
                ? 'Tidak ada pipeline yang cocok dengan pencarian Anda.'
                : 'Buat pipeline pertama — daftarkan sumber data terlebih dahulu jika perlu.'
            }
            skeletonColumns={3}
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p: PipelineSummary, i: number) => (
                <PipelineCard key={p.slug} pipeline={p} index={i} />
              ))}
            </div>
            {!search && (data?.total ?? 0) > items.length && (
              <p className="mt-8 text-center text-sm text-neutral-500">
                Menampilkan {items.length} dari {data?.total}{' '}
                <button
                  type="button"
                  className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Muat lebih banyak
                </button>
              </p>
            )}
          </QueryState>

          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Butuh mendaftarkan dataset?{' '}
              <Link href="/factory/sources" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                Kelola sumber data →
              </Link>
            </p>
          </div>
        </div>
      </div>

      <CreatePipelineDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </FeaturePageShell>
  )
}

export function PipelinesPage() {
  return (
    <Suspense>
      <PipelinesPageInner />
    </Suspense>
  )
}
