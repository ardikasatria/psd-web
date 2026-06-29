'use client'

import { modelGradient } from '@/components/common/featureGradients'
import { pageHighlightStripClass } from '@/components/common/SidebarStatTile'
import { MlRegistryCard } from '@/components/features/ml/MlRegistryCard'
import { MlRegistryConceptSection } from '@/components/features/ml/MlRegistryConceptSection'
import { MlRegistryLearnSidebar } from '@/components/features/ml/MlRegistryLearnSidebar'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { createModelRegistry, listModelRegistries } from '@/lib/api/ml'
import { useAuth } from '@/lib/auth/useAuth'
import type { ModelRegistrySummary } from '@/lib/api/ml'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Button } from '@/shared/Button'
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  RectangleStackIcon,
  SignalIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'

function matchesSearch(registry: ModelRegistrySummary, q: string) {
  if (!q) return true
  const hay = `${registry.title} ${registry.mlflow_name} ${registry.repo_id ?? ''}`.toLowerCase()
  return hay.includes(q.toLowerCase())
}

function MlRegistryPageInner() {
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const searchParams = useSearchParams()
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [repoId, setRepoId] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const fromRepo = searchParams.get('repo_id')
    if (fromRepo) {
      setRepoId(fromRepo)
      setShowForm(true)
    }
  }, [searchParams])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ml-registries'],
    queryFn: () => listModelRegistries({ page: 1 }),
    enabled: isLoggedIn,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createModelRegistry({
        title,
        repo_id: repoId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ml-registries'] })
      setTitle('')
      setRepoId('')
      setShowForm(false)
    },
  })

  const items = data?.items ?? []
  const filtered = useMemo(() => items.filter((r) => matchesSearch(r, search)), [items, search])
  const withMonitoring = items.filter((r) => r.monitoring_dashboard_id)
  const withRepo = items.filter((r) => r.repo_id)

  const scrollToCatalog = useCallback(() => {
    document.getElementById('ml-registry-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const openCreateForm = useCallback(() => {
    setShowForm(true)
    scrollToCatalog()
  }, [scrollToCatalog])

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <MlRegistryLearnSidebar
          className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72"
          items={items}
          onScrollToCatalog={scrollToCatalog}
          onCreateRegistry={isLoggedIn ? openCreateForm : undefined}
        />

        <div className="order-1 min-w-0 flex-1 space-y-8 lg:order-2">
          <div className={modelGradient.hero}>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                  <SparklesIcon className="size-3.5" aria-hidden />
                  MLOps & MLflow
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Registry Model
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Lacak versi model di MLflow, pantau drift data produksi, dan kelola endpoint serving — jembatan
                  antara eksperimen notebook dan inferensi terpantau.
                </p>
              </div>
              {isLoggedIn ? (
                <ButtonPrimary type="button" onClick={openCreateForm} className="shrink-0">
                  <PlusIcon className="size-4" aria-hidden />
                  Registry baru
                </ButtonPrimary>
              ) : (
                <ButtonPrimary href="/login?next=/ml" className="shrink-0">
                  Masuk untuk registry
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

          <MlRegistryConceptSection />

          {isLoggedIn && withMonitoring.length > 0 && !search && (
            <section className={pageHighlightStripClass}>
              <div className="mb-4 flex items-center gap-2">
                <SignalIcon className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Aktif dimonitor
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {withMonitoring.slice(0, 4).map((r) => (
                  <Link
                    key={r.slug}
                    href={`/ml/${r.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-white dark:border-neutral-600 dark:bg-neutral-800/90 dark:text-neutral-200"
                  >
                    {r.title}
                    <span className="text-xs text-neutral-500">drift aktif</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {isLoggedIn && withRepo.length > 0 && !search && (
            <section className={pageHighlightStripClass}>
              <div className="mb-4 flex items-center gap-2">
                <ArrowPathIcon className="size-5 text-violet-600 dark:text-violet-400" aria-hidden />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Terhubung ke katalog
                </h2>
              </div>
              <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">
                Registry ini terikat ke repo model di{' '}
                <Link href="/models" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                  katalog PSD
                </Link>
                .
              </p>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {withRepo.slice(0, 4).map((r) => (
                  <Link
                    key={r.slug}
                    href={`/ml/${r.slug}`}
                    className="flex w-56 shrink-0 flex-col rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/95"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                      MLflow
                    </span>
                    <p className="mt-2 line-clamp-2 font-medium text-neutral-900 dark:text-neutral-100">
                      {r.title}
                    </p>
                    <p className="mt-2 font-mono text-xs text-neutral-500">{r.mlflow_name}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div id="ml-registry-catalog" className="scroll-mt-28 space-y-4">
            {isLoggedIn && (
              <>
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
                    placeholder="Cari registry, nama MLflow, atau repo…"
                    className="!rounded-2xl !py-3 !ps-12 !pe-10 text-base shadow-sm ring-1 ring-primary-100/80 dark:ring-primary-900/40"
                    aria-label="Cari registry"
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

                {showForm && (
                  <form
                    className="space-y-4 rounded-2xl border border-violet-200/80 bg-violet-50/40 p-6 dark:border-violet-800/50 dark:bg-violet-950/20"
                    onSubmit={(e) => {
                      e.preventDefault()
                      createMutation.mutate()
                    }}
                  >
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Buat registry baru</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Hubungkan ke repo model yang sudah ada di katalog, atau buat registry kosong lalu daftarkan
                      versi dari notebook.
                    </p>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Judul registry (mis. Prediksi churn v1)"
                      required
                    />
                    <Input
                      value={repoId}
                      onChange={(e) => setRepoId(e.target.value)}
                      placeholder="repo_id model (opsional, mis. mdl_01)"
                    />
                    <div className="flex flex-wrap gap-2">
                      <ButtonPrimary type="submit" disabled={createMutation.isPending || !title.trim()}>
                        {createMutation.isPending ? 'Mendaftarkan…' : 'Daftarkan'}
                      </ButtonPrimary>
                      <Button type="button" onClick={() => setShowForm(false)}>
                        Batal
                      </Button>
                    </div>
                    {createMutation.isError && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {(createMutation.error as Error).message}
                      </p>
                    )}
                  </form>
                )}
              </>
            )}

            {!isLoggedIn ? (
              <div className="rounded-3xl border border-dashed border-violet-300/70 bg-violet-50/40 px-6 py-10 text-center dark:border-violet-800 dark:bg-violet-950/20">
                <RectangleStackIcon className="mx-auto size-10 text-violet-500" aria-hidden />
                <p className="mt-4 font-semibold text-neutral-900 dark:text-neutral-100">
                  Masuk untuk mengelola registry
                </p>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  Daftarkan model ke MLflow, pantau drift, dan akses endpoint serving setelah masuk.
                </p>
                <ButtonPrimary href="/login?next=/ml" className="mt-5">
                  Masuk
                </ButtonPrimary>
              </div>
            ) : (
              <QueryState
                isLoading={isLoading}
                isError={isError}
                error={error}
                isEmpty={!filtered.length}
                emptyTitle="Belum ada registry"
                emptyDescription={
                  search
                    ? 'Tidak ada registry yang cocok dengan pencarian Anda.'
                    : 'Buat registry pertama — hubungkan ke repo model atau daftarkan versi dari kompetisi.'
                }
                skeletonColumns={2}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  {filtered.map((r, i) => (
                    <MlRegistryCard key={r.slug} registry={r} index={i} />
                  ))}
                </div>
              </QueryState>
            )}
          </div>

          {!isLoggedIn && (
            <div className="rounded-3xl border border-dashed border-violet-300/70 bg-violet-50/40 px-6 py-8 text-center dark:border-violet-800 dark:bg-violet-950/20">
              <RectangleStackIcon className="mx-auto size-8 text-violet-500" aria-hidden />
              <p className="mt-3 font-semibold text-neutral-900 dark:text-neutral-100">
                Siap melacak model di produksi?
              </p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Masuk untuk membuat registry MLflow, menjalankan drift check, dan mengelola serving.
              </p>
              <Link
                href="/login?next=/ml"
                className="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Mulai dengan registry pertama
              </Link>
            </div>
          )}
        </div>
      </div>
    </FeaturePageShell>
  )
}

export function MlRegistryPage() {
  return (
    <Suspense fallback={null}>
      <MlRegistryPageInner />
    </Suspense>
  )
}
