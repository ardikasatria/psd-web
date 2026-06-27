'use client'

import { pageHighlightStripClass } from '@/components/common/SidebarStatTile'
import { DatasetCard } from '@/components/features/datasets/DatasetCard'
import { ModelCard } from '@/components/features/models/ModelCard'
import { QueryState } from '@/components/features/QueryState'
import { CollectionCard } from '@/components/features/transformer/CollectionCard'
import { CreateCollectionDialog } from '@/components/features/transformer/CreateCollectionDialog'
import { TransformerConceptSection } from '@/components/features/transformer/TransformerConceptSection'
import { TransformerSidebar } from '@/components/features/transformer/TransformerSidebar'
import { FeaturePageShell } from '@/components/features/layout'
import { getTransformerHub } from '@/lib/api/collections'
import { isStaff } from '@/lib/auth/roles'
import { useAuth } from '@/lib/auth/useAuth'
import type { Collection, RepoSummary, TransformerHub } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  BeakerIcon,
  CircleStackIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  PlusIcon,
  RectangleStackIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Suspense, useState } from 'react'

type HubTab = 'models' | 'datasets' | 'notebooks'

const TABS: { id: HubTab; label: string; icon: typeof BeakerIcon }[] = [
  { id: 'models', label: 'Model teratas', icon: BeakerIcon },
  { id: 'datasets', label: 'Dataset teratas', icon: CircleStackIcon },
  { id: 'notebooks', label: 'Notebook', icon: CodeBracketSquareIcon },
]

function TransformerHubPageInner() {
  const { user } = useAuth()
  const staff = isStaff(user)
  const [tab, setTab] = useState<HubTab>('models')
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, error } = useQuery<TransformerHub>({
    queryKey: ['transformer-hub'],
    queryFn: getTransformerHub,
  })

  const empty = !data?.category
  const categoryName = data?.category?.name ?? 'Transformer'
  const categoryDesc =
    data?.category?.description ??
    'Model & dataset Transformer berkonteks Indonesia — etalase kurasi tim PSD.'

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
                  Kurasi Transformer
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Ruang Transformer
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {empty ? (
                    <>
                      Etalase model, dataset, dan notebook bertema Transformer akan segera hadir di PSD.
                      Model & dataset Transformer berkonteks Indonesia — satu pintu masuk kurasi lokal.
                    </>
                  ) : (
                    <>
                      <strong className="font-semibold text-neutral-800 dark:text-neutral-200">{categoryName}</strong>
                      {' — '}
                      {categoryDesc} Model & dataset Transformer berkonteks Indonesia.
                    </>
                  )}
                </p>
              </div>
              {staff && (
                <ButtonPrimary type="button" onClick={() => setCreateOpen(true)} className="shrink-0">
                  <PlusIcon className="size-4" aria-hidden />
                  Buat koleksi
                </ButtonPrimary>
              )}
            </div>
            <div className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-violet-400/10 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-20 start-1/3 size-48 rounded-full bg-indigo-400/10 blur-3xl" aria-hidden />
          </div>

          <TransformerConceptSection />

          <QueryState isLoading={isLoading} isError={isError} error={error} skeletonColumns={3}>
            {empty ? (
              <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-16 text-center dark:border-neutral-600 dark:bg-neutral-800/40">
                <CpuChipIcon className="mx-auto size-12 text-neutral-300 dark:text-neutral-600" aria-hidden />
                <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Segera hadir</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
                  Kategori Transformer belum tersedia. Tim humas sedang menyiapkan kurasi awal — cek kembali nanti.
                </p>
              </div>
            ) : (
              <>
                {(data?.collections.length ?? 0) > 0 && (
                  <section className={pageHighlightStripClass}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <SparklesIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Koleksi unggulan</h2>
                      </div>
                      <Link
                        href="/collections?featured=true"
                        className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                      >
                        Lihat semua
                      </Link>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {data!.collections.map((c: Collection, i: number) => (
                        <CollectionCard key={c.slug} collection={c} index={i} />
                      ))}
                    </div>
                  </section>
                )}

                <section className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {TABS.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={clsx(
                          'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition',
                          tab === id
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700',
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                        {label}
                      </button>
                    ))}
                  </div>

                  {tab === 'models' && (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {(data?.models ?? []).length === 0 ? (
                        <p className="col-span-full text-sm text-neutral-500">Belum ada model kategori Transformer.</p>
                      ) : (
                        data!.models.map((m: RepoSummary, i: number) => <ModelCard key={m.id} model={m} index={i} />)
                      )}
                    </div>
                  )}

                  {tab === 'datasets' && (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {(data?.datasets ?? []).length === 0 ? (
                        <p className="col-span-full text-sm text-neutral-500">Belum ada dataset kategori Transformer.</p>
                      ) : (
                        data!.datasets.map((d: RepoSummary, i: number) => <DatasetCard key={d.id} dataset={d} index={i} />)
                      )}
                    </div>
                  )}

                  {tab === 'notebooks' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(data?.notebooks ?? []).length === 0 ? (
                        <p className="col-span-full text-sm text-neutral-500">Belum ada notebook kategori Transformer.</p>
                      ) : (
                        data!.notebooks.map((nb: { id: string; title: string }) => (
                          <Link
                            key={nb.id}
                            href={`/notebooks/${nb.id}`}
                            className="flex items-center gap-4 rounded-2xl border border-neutral-200/80 bg-white p-4 transition hover:border-primary-200 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800"
                          >
                            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white">
                              <CodeBracketSquareIcon className="size-5" aria-hidden />
                            </div>
                            <span className="font-medium text-neutral-900 dark:text-neutral-100">{nb.title}</span>
                          </Link>
                        ))
                      )}
                    </div>
                  )}
                </section>

                <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <RectangleStackIcon className="size-5 text-neutral-500" aria-hidden />
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Jelajahi semua koleksi kurasi Transformer
                      </p>
                    </div>
                    <Link
                      href="/collections"
                      className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                      Buka daftar koleksi →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </QueryState>
        </div>
      </div>

      <CreateCollectionDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </FeaturePageShell>
  )
}

export function TransformerHubPage() {
  return (
    <Suspense>
      <TransformerHubPageInner />
    </Suspense>
  )
}
