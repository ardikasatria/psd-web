'use client'

import { QueryState } from '@/components/features/QueryState'
import { FactorySidebar } from '@/components/features/factory/FactorySidebar'
import { RegisterSourceDialog } from '@/components/features/factory/RegisterSourceDialog'
import { factoryGradient } from '@/components/common/featureGradients'
import { FeaturePageShell } from '@/components/features/layout'
import { deleteSource, listSources } from '@/lib/api/factory'
import { useAuth } from '@/lib/auth/useAuth'
import type { DataSource } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import {
  CircleStackIcon,
  Cog6ToothIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Suspense, useState } from 'react'

function DataSourcesPageInner() {
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [registerOpen, setRegisterOpen] = useState(false)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['factory-sources'],
    queryFn: listSources,
    enabled: isLoggedIn,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteSource(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['factory-sources'] }),
  })

  const items = data?.items ?? []

  if (!isLoggedIn) {
    return (
      <FeaturePageShell>
        <div className="mx-auto max-w-lg rounded-3xl border border-neutral-200/80 bg-white p-10 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <CircleStackIcon className="mx-auto size-12 text-neutral-300 dark:text-neutral-600" aria-hidden />
          <h1 className="mt-4 text-xl font-bold text-neutral-900 dark:text-neutral-50">Sumber Data</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Masuk untuk mendaftarkan dataset sebagai sumber.</p>
          <ButtonPrimary href="/login?next=/factory/sources" className="mt-6">
            Masuk
          </ButtonPrimary>
        </div>
      </FeaturePageShell>
    )
  }

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <FactorySidebar className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72" />

        <div className="order-1 min-w-0 flex-1 space-y-8 lg:order-2">
          <div className={factoryGradient.hero}>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  <CircleStackIcon className="size-3.5" aria-hidden />
                  URI sumber
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Sumber Data
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Daftarkan dataset PSD sebagai sumber pipeline dengan URI{' '}
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm dark:bg-neutral-800">psd://dataset/…</code>
                </p>
              </div>
              <ButtonPrimary type="button" onClick={() => setRegisterOpen(true)} className="shrink-0">
                <PlusIcon className="size-4" aria-hidden />
                Daftarkan dataset
              </ButtonPrimary>
            </div>
          </div>

          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!items.length}
            emptyTitle="Belum ada sumber data"
            emptyDescription="Daftarkan dataset dari registry PSD untuk digunakan di node source pipeline."
            skeletonColumns={2}
          >
            <div className="space-y-3">
              {items.map((src: DataSource) => (
                <div
                  key={src.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white">
                      <CircleStackIcon className="size-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{src.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-neutral-500 dark:text-neutral-400">{src.uri}</p>
                      <p className="mt-1 text-xs capitalize text-neutral-500">{src.kind}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    outline
                    disabled={remove.isPending}
                    onClick={() => {
                      if (confirm('Hapus sumber ini?')) remove.mutate(src.id)
                    }}
                  >
                    <TrashIcon className="size-4" aria-hidden />
                    Hapus
                  </Button>
                </div>
              ))}
            </div>
          </QueryState>

          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              <Link href="/factory/pipelines" className="inline-flex items-center gap-1 font-medium text-primary-600 hover:underline dark:text-primary-400">
                <Cog6ToothIcon className="size-4" aria-hidden />
                Kembali ke daftar pipeline
              </Link>
            </p>
          </div>
        </div>
      </div>

      <RegisterSourceDialog open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </FeaturePageShell>
  )
}

export function DataSourcesPage() {
  return (
    <Suspense>
      <DataSourcesPageInner />
    </Suspense>
  )
}
