'use client'

import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { createModelRegistry, listModelRegistries } from '@/lib/api/ml'
import { getServingQuota } from '@/lib/api/serving'
import { useAuth } from '@/lib/auth/useAuth'
import type { ModelRegistrySummary } from '@/lib/api/ml'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Button } from '@/shared/Button'
import { BeakerIcon, CubeIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function MlRegistryPageInner() {
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const searchParams = useSearchParams()
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

  const quota = useQuery({
    queryKey: ['serving-quota'],
    queryFn: getServingQuota,
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

  if (!isLoggedIn) {
    return (
      <FeaturePageShell>
        <div className="mx-auto max-w-lg rounded-3xl border border-neutral-200/80 bg-white p-10 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <CubeIcon className="mx-auto size-12 text-neutral-300 dark:text-neutral-600" aria-hidden />
          <h1 className="mt-4 text-xl font-bold">Registry Model</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Masuk untuk mendaftarkan model ke MLflow dan memantau drift.
          </p>
          <ButtonPrimary href="/login?next=/ml" className="mt-6">
            Masuk
          </ButtonPrimary>
        </div>
      </FeaturePageShell>
    )
  }

  const items = data?.items ?? []

  return (
    <FeaturePageShell>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
              <BeakerIcon className="size-3.5" aria-hidden />
              MLOps
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Registry Model</h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Versi model MLflow — drift, monitoring, dan endpoint inferensi terkelola.
            </p>
            {quota.data && (
              <p className="mt-2 text-xs text-neutral-500">
                Kuota prediksi tier <strong>{quota.data.tier}</strong>: {quota.data.used}/{quota.data.limit}{' '}
                per jam ({quota.data.remaining} tersisa)
              </p>
            )}
          </div>
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            <PlusIcon className="size-4" aria-hidden />
            Registry baru
          </Button>
        </div>

        {showForm && (
          <form
            className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800"
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate()
            }}
          >
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul registry" required />
            <Input
              value={repoId}
              onChange={(e) => setRepoId(e.target.value)}
              placeholder="repo_id model (opsional, mis. mdl_01)"
            />
            <ButtonPrimary type="submit" disabled={createMutation.isPending || !title.trim()}>
              Daftarkan
            </ButtonPrimary>
          </form>
        )}

        <QueryState isLoading={isLoading} isError={isError} error={error} skeletonColumns={1}>
          {items.length === 0 ? (
            <p className="text-sm text-neutral-500">Belum ada registry — buat dari repo model atau kompetisi.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((r: ModelRegistrySummary) => (
                <li key={r.slug}>
                  <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 transition hover:border-violet-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-violet-700">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link href={`/ml/${r.slug}`} className="min-w-0 flex-1">
                        <div className="font-semibold text-neutral-900 hover:text-violet-700 dark:text-neutral-50 dark:hover:text-violet-300">
                          {r.title}
                        </div>
                        <div className="mt-1 font-mono text-xs text-neutral-500">{r.mlflow_name}</div>
                      </Link>
                      <Link
                        href={`/ml/${r.slug}/serving`}
                        className="shrink-0 text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
                      >
                        Serving →
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
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
