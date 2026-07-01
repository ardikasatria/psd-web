'use client'

import { QueryState } from '@/components/features/QueryState'
import { HarvestConceptSection } from '@/components/features/harvest/HarvestConceptSection'
import { HarvestJobCard } from '@/components/features/harvest/HarvestJobCard'
import { HarvestSidebar } from '@/components/features/harvest/HarvestSidebar'
import { HarvestWizardDialog } from '@/components/features/harvest/HarvestWizardDialog'
import { isActiveHarvestStatus } from '@/components/features/harvest/harvest-utils'
import { harvestGradient } from '@/components/common/featureGradients'
import { FeaturePageShell } from '@/components/features/layout'
import { listJobs } from '@/lib/api/harvest'
import { useAuth } from '@/lib/auth/useAuth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import {
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldExclamationIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

function HarvestPageInner() {
  const searchParams = useSearchParams()
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [wizardOpen, setWizardOpen] = useState(searchParams.get('create') === '1')

  useEffect(() => {
    if (searchParams.get('create') === '1') setWizardOpen(true)
  }, [searchParams])

  const jobsQuery = useQuery({
    queryKey: ['harvest-jobs'],
    queryFn: listJobs,
    enabled: isLoggedIn,
    refetchInterval: (q) => {
      const items = q.state.data ?? []
      return items.some((j) => isActiveHarvestStatus(j.status)) ? 2000 : 30_000
    },
  })

  const filtered = useMemo(() => {
    const items = jobsQuery.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (j) =>
        j.name.toLowerCase().includes(q) ||
        (j.source_url ?? '').toLowerCase().includes(q),
    )
  }, [jobsQuery.data, search])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['harvest-jobs'] })

  if (!isLoggedIn) {
    return (
      <FeaturePageShell>
        <div className="mx-auto max-w-lg rounded-3xl border border-neutral-200/80 bg-white p-10 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <ArrowDownTrayIcon
            className="mx-auto size-12 text-emerald-300 dark:text-emerald-700"
            aria-hidden
          />
          <h1 className="mt-4 text-xl font-bold text-neutral-900 dark:text-neutral-50">
            Ruang Panen Data
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Masuk untuk menyusun job panen API eksternal dan menyalurkan hasil ke dataset Anda.
          </p>
          <ButtonPrimary href="/login?next=/harvest" className="mt-6">
            Masuk
          </ButtonPrimary>
        </div>
      </FeaturePageShell>
    )
  }

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <HarvestSidebar
          className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72"
          onCreateClick={() => setWizardOpen(true)}
        />

        <div className="order-1 min-w-0 flex-1 space-y-8 lg:order-2">
          <div className={harvestGradient.hero}>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <ArrowDownTrayIcon className="size-3.5" aria-hidden />
                  API → Dataset
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Ruang Panen Data
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Susun job panen dari API eksternal — paginasi sopan, pemetaan field, dan hasil langsung
                  menjadi aset dataset milik Anda.
                </p>
              </div>
              <ButtonPrimary type="button" onClick={() => setWizardOpen(true)} className="shrink-0">
                <PlusIcon className="size-4" aria-hidden />
                Job panen baru
              </ButtonPrimary>
            </div>
            <div
              className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-600/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 start-1/3 size-48 rounded-full bg-teal-400/10 blur-3xl dark:bg-teal-600/10"
              aria-hidden
            />
          </div>

          <div className={harvestGradient.ethicsBanner}>
            <ShieldExclamationIcon className="size-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <p className="text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
              Panen hanya sumber yang Anda punya hak/izin aksesnya. Hormati ketentuan layanan (ToS) &
              rate limit. Domain di luar allowlist — hubungi admin untuk penambahan.
            </p>
          </div>

          <HarvestConceptSection />

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
                placeholder="Cari job panen…"
                className="!rounded-2xl !py-3 !ps-12 !pe-10 text-base shadow-sm ring-1 ring-emerald-100/80 dark:ring-emerald-900/40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-neutral-400 hover:text-neutral-600"
                  aria-label="Hapus pencarian"
                >
                  <XMarkIcon className="size-5" />
                </button>
              )}
            </div>

            <QueryState
              isLoading={jobsQuery.isLoading}
              isError={jobsQuery.isError}
              error={jobsQuery.error}
              isEmpty={!filtered.length}
              emptyTitle="Belum ada job panen"
              emptyDescription="Buat job pertama untuk mulai memanen data dari API eksternal."
            >
              <div className="space-y-4">
                {filtered.map((job, i) => (
                  <HarvestJobCard key={job.id} job={job} index={i} onChanged={invalidate} />
                ))}
              </div>
            </QueryState>
          </div>
        </div>
      </div>

      <HarvestWizardDialog open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </FeaturePageShell>
  )
}

export function HarvestPage() {
  return (
    <Suspense fallback={null}>
      <HarvestPageInner />
    </Suspense>
  )
}
