'use client'

import { ModelServingPanel } from '@/components/features/ml/ModelServingPanel'
import { QueryState } from '@/components/features/QueryState'
import { getModelRegistry, listDriftReports } from '@/lib/api/ml'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

export function MlServingPageContent({ slug }: { slug: string }) {
  const registry = useQuery({
    queryKey: ['ml-registry', slug],
    queryFn: () => getModelRegistry(slug),
  })

  const drift = useQuery({
    queryKey: ['ml-drift', slug],
    queryFn: () => listDriftReports(slug),
    enabled: Boolean(registry.data),
  })

  const hasProduction = registry.data?.versions.some((v) => v.stage === 'Production') ?? false

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="text-sm text-neutral-500">
        <Link href="/ml" className="hover:text-primary-600">
          Registry Model
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/ml/${slug}`} className="hover:text-primary-600">
          {registry.data?.title ?? slug}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-800 dark:text-neutral-200">Serving</span>
      </div>

      <QueryState
        isLoading={registry.isLoading}
        isError={registry.isError}
        error={registry.error}
        skeletonColumns={1}
      >
        {registry.data && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Endpoint inferensi</h1>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Hosting prediksi terkelola untuk <strong>{registry.data.title}</strong>.
              </p>
            </div>
            <ModelServingPanel
              modelSlug={slug}
              mlflowName={registry.data.mlflow_name}
              hasProductionVersion={hasProduction}
              driftReports={drift.data?.items ?? []}
            />
          </>
        )}
      </QueryState>
    </div>
  )
}
