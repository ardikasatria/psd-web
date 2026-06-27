'use client'

import { QueryState } from '@/components/features/QueryState'
import { CollectionCard } from '@/components/features/transformer/CollectionCard'
import { CreateCollectionDialog } from '@/components/features/transformer/CreateCollectionDialog'
import { TransformerSidebar } from '@/components/features/transformer/TransformerSidebar'
import { FeaturePageShell } from '@/components/features/layout'
import { listCollections } from '@/lib/api/collections'
import { isStaff } from '@/lib/auth/roles'
import { useAuth } from '@/lib/auth/useAuth'
import type { Collection, PaginatedCollection } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import {
  CpuChipIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function CollectionsPageInner() {
  const searchParams = useSearchParams()
  const initialFeatured = searchParams.get('featured') === 'true'
  const { user } = useAuth()
  const staff = isStaff(user)
  const [featuredOnly, setFeaturedOnly] = useState(initialFeatured)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, error } = useQuery<PaginatedCollection>({
    queryKey: ['collections', featuredOnly, page],
    queryFn: () =>
      listCollections({
        featured: featuredOnly ? true : undefined,
        category: 'transformer',
        page,
      }),
  })

  const items = data?.items ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((c: Collection) => c.title.toLowerCase().includes(q))
  }, [items, search])

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <TransformerSidebar
          className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72"
          onCreateClick={staff ? () => setCreateOpen(true) : undefined}
        />

        <div className="order-1 min-w-0 flex-1 space-y-8 lg:order-2">
          <div className="relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-violet-50 via-indigo-50/70 to-sky-50/60 p-8 dark:border-primary-900/40 dark:from-violet-950/30 dark:via-neutral-900 dark:to-indigo-950/25 sm:p-10">
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                  <CpuChipIcon className="size-3.5" aria-hidden />
                  Koleksi kurasi
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Koleksi Transformer
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Daftar kurasi staf PSD — model, dataset, notebook, dan proyek bertema Transformer yang sudah disaring
                  untuk konteks Indonesia.
                </p>
              </div>
              {staff && (
                <ButtonPrimary type="button" onClick={() => setCreateOpen(true)} className="shrink-0">
                  <PlusIcon className="size-4" aria-hidden />
                  Buat koleksi
                </ButtonPrimary>
              )}
            </div>
          </div>

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
                placeholder="Cari koleksi…"
                className="!rounded-2xl !py-3 !ps-12 !pe-10 text-base shadow-sm ring-1 ring-primary-100/80 dark:ring-primary-900/40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100"
                  aria-label="Hapus pencarian"
                >
                  <XMarkIcon className="size-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setFeaturedOnly(false)
                  setPage(1)
                }}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition',
                  !featuredOnly
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700',
                )}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => {
                  setFeaturedOnly(true)
                  setPage(1)
                }}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition',
                  featuredOnly
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700',
                )}
              >
                <SparklesIcon className="size-4" aria-hidden />
                Unggulan
              </button>
            </div>
          </div>

          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!filtered.length}
            emptyTitle="Belum ada koleksi"
            emptyDescription={
              search
                ? 'Tidak ada koleksi yang cocok dengan pencarian Anda.'
                : 'Tim humas sedang menyiapkan kurasi Transformer pertama.'
            }
            skeletonColumns={3}
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((c: Collection, i: number) => (
                <CollectionCard key={c.slug} collection={c} index={i} />
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
        </div>
      </div>

      <CreateCollectionDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </FeaturePageShell>
  )
}

export function CollectionsPage() {
  return (
    <Suspense>
      <CollectionsPageInner />
    </Suspense>
  )
}
