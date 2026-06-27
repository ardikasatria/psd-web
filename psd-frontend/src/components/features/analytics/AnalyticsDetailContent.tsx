'use client'

import { AddWidgetDialog } from '@/components/features/analytics/AddWidgetDialog'
import { DashboardGrid } from '@/components/features/analytics/DashboardGrid'
import { darkPanelClass } from '@/components/common/featureGradients'
import { QueryState } from '@/components/features/QueryState'
import { deleteDashboard, getDashboard, updateDashboard } from '@/lib/api/dashboards'
import { getPipeline, listPipelines, listSources } from '@/lib/api/factory'
import { pipelineUsesSynthesis } from '@/lib/analytics/pipelineGold'
import type { Dashboard } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import {
  ChartBarSquareIcon,
  GlobeAltIcon,
  LockClosedIcon,
  PlusIcon,
  ShareIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import clsx from 'clsx'

type Props = {
  slug: string
}

export function AnalyticsDetailContent({ slug }: Props) {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)

  const { data, isLoading, isError, error } = useQuery<Dashboard>({
    queryKey: ['analytics-dashboard', slug],
    queryFn: () => getDashboard(slug),
  })

  const pipeline = useQuery({
    queryKey: ['factory-pipeline-for-analytics', data?.pipeline_id],
    queryFn: async () => {
      const plId = data?.pipeline_id
      if (!plId) return null
      const list = await listPipelines({ page: 1 })
      const summary = list.items.find((p) => p.id === plId)
      if (!summary) return null
      return getPipeline(summary.slug)
    },
    enabled: Boolean(data?.pipeline_id),
  })

  const sources = useQuery({
    queryKey: ['factory-sources'],
    queryFn: listSources,
    enabled: Boolean(pipeline.data?.spec),
  })

  const isSynthesis = useMemo(
    () => pipelineUsesSynthesis(pipeline.data?.spec, sources.data?.items ?? []),
    [pipeline.data?.spec, sources.data?.items],
  )

  const toggleVisibility = useMutation({
    mutationFn: (visibility: 'private' | 'public') => updateDashboard(slug, { visibility }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analytics-dashboard', slug] }),
  })

  const removeDashboard = useMutation({
    mutationFn: () => deleteDashboard(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analytics-dashboards'] })
      window.location.href = '/analytics'
    },
  })

  const isPublic = data?.visibility === 'public'
  const widgets = data?.widgets ?? []
  const layout = (data?.layout ?? []) as { i: string; x: number; y: number; w: number; h: number }[]

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
        <Link href="/analytics" className="hover:text-primary-600 dark:hover:text-primary-400">
          Ruang Analitik
        </Link>
        <span>/</span>
        <span className="text-neutral-800 dark:text-neutral-200">{data?.title ?? slug}</span>
      </div>

      <QueryState isLoading={isLoading} isError={isError} error={error} skeletonColumns={2}>
        {data && (
          <>
            <div className={clsx(darkPanelClass, 'p-6 sm:p-8')}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        isPublic
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
                      )}
                    >
                      {isPublic ? (
                        <>
                          <GlobeAltIcon className="size-3.5" aria-hidden />
                          Publik
                        </>
                      ) : (
                        <>
                          <LockClosedIcon className="size-3.5" aria-hidden />
                          Privat
                        </>
                      )}
                    </span>
                    {isSynthesis && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
                        <SparklesIcon className="size-3.5" aria-hidden />
                        Data Sintesis
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 sm:text-3xl">{data.title}</h1>
                  {data.description_md && (
                    <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{data.description_md}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonPrimary type="button" onClick={() => setAddOpen(true)}>
                    <PlusIcon className="size-4" aria-hidden />
                    Widget
                  </ButtonPrimary>
                  <Button
                    type="button"
                    outline
                    disabled={toggleVisibility.isPending}
                    onClick={() => toggleVisibility.mutate(isPublic ? 'private' : 'public')}
                  >
                    <ShareIcon className="size-4" aria-hidden />
                    {isPublic ? 'Jadikan privat' : 'Bagikan (publik)'}
                  </Button>
                  <Button
                    type="button"
                    outline
                    disabled={removeDashboard.isPending}
                    onClick={() => {
                      if (confirm('Hapus dashboard ini beserta semua widget?')) removeDashboard.mutate()
                    }}
                  >
                    <TrashIcon className="size-4" aria-hidden />
                    Hapus
                  </Button>
                </div>
              </div>
            </div>

            {widgets.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50/50 px-6 py-16 text-center dark:border-neutral-600 dark:bg-neutral-900/30">
                <ChartBarSquareIcon className="mx-auto size-10 text-neutral-300 dark:text-neutral-600" aria-hidden />
                <p className="mt-4 font-medium text-neutral-800 dark:text-neutral-200">Belum ada widget</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Tambahkan widget KPI atau chart yang membaca node gold pipeline.
                </p>
                <ButtonPrimary type="button" className="mt-6" onClick={() => setAddOpen(true)}>
                  Tambah widget pertama
                </ButtonPrimary>
              </div>
            ) : (
              <DashboardGrid slug={slug} widgets={widgets} layout={layout} editable />
            )}
          </>
        )}
      </QueryState>

      <AddWidgetDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        dashboardSlug={slug}
        pipelineId={data?.pipeline_id}
      />
    </div>
  )
}
