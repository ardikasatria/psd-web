'use client'

import { enableSupersetEmbed, promoteDashboardToSuperset } from '@/lib/api/bi'
import type { Dashboard } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'
import { ChartBarSquareIcon } from '@heroicons/react/24/outline'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

type Props = {
  slug: string
  dashboard: Dashboard
}

export function SupersetIntegrationPanel({ slug, dashboard }: Props) {
  const qc = useQueryClient()
  const [dashboardId, setDashboardId] = useState('')
  const [embedDashboardId, setEmbedDashboardId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['analytics-dashboard', slug] })

  const promote = useMutation({
    mutationFn: () => {
      const id = dashboardId.trim() ? Number(dashboardId.trim()) : undefined
      if (dashboardId.trim() && Number.isNaN(id)) {
        throw new Error('ID dashboard harus angka.')
      }
      return promoteDashboardToSuperset(slug, {
        superset_dashboard_id: id ?? null,
      })
    },
    onSuccess: () => {
      setError(null)
      invalidate()
    },
    onError: (e: Error) => setError(e.message),
  })

  const enableEmbed = useMutation({
    mutationFn: () => {
      const id = Number(embedDashboardId.trim())
      if (!embedDashboardId.trim() || Number.isNaN(id) || id < 1) {
        throw new Error('Masukkan ID dashboard Superset yang valid.')
      }
      return enableSupersetEmbed(slug, id)
    },
    onSuccess: () => {
      setError(null)
      invalidate()
    },
    onError: (e: Error) => setError(e.message),
  })

  const refreshDataset = useMutation({
    mutationFn: () => promoteDashboardToSuperset(slug, {}),
    onSuccess: () => {
      setError(null)
      invalidate()
    },
    onError: (e: Error) => setError(e.message),
  })

  if (!dashboard.pipeline_id) return null

  const hasDataset = Boolean(dashboard.superset_dataset_id)
  const hasEmbed = Boolean(dashboard.superset_embed_uuid)

  if (hasEmbed) return null

  return (
    <section className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-5 dark:border-sky-900/50 dark:bg-sky-950/20">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-sky-900 dark:text-sky-200">
        <ChartBarSquareIcon className="size-4" aria-hidden />
        Integrasi Superset
      </h3>

      {!hasDataset ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-sky-900/80 dark:text-sky-200/80">
            Promote dataset gold pipeline ke Superset. Opsional: masukkan ID dashboard Superset untuk langsung
            mengaktifkan embed.
          </p>
          <div>
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              ID dashboard Superset (opsional)
            </label>
            <Input
              value={dashboardId}
              onChange={(e) => setDashboardId(e.target.value)}
              placeholder="mis. 12"
              className="mt-1 max-w-xs !rounded-xl"
            />
          </div>
          <ButtonPrimary type="button" disabled={promote.isPending} onClick={() => promote.mutate()}>
            {promote.isPending ? 'Mem-promote…' : 'Promote ke Superset'}
          </ButtonPrimary>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-sky-900/80 dark:text-sky-200/80">
            Dataset gold sudah ter-provision
            {dashboard.superset_gold_table ? ` (${dashboard.superset_gold_table})` : ''}. Buat dashboard di Superset
            dengan dataset tersebut, lalu aktifkan embed.
          </p>
          <div>
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              ID dashboard Superset
            </label>
            <Input
              value={embedDashboardId}
              onChange={(e) => setEmbedDashboardId(e.target.value)}
              placeholder="ID dari URL Superset"
              className="mt-1 max-w-xs !rounded-xl"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonPrimary type="button" disabled={enableEmbed.isPending} onClick={() => enableEmbed.mutate()}>
              {enableEmbed.isPending ? 'Mengaktifkan…' : 'Aktifkan embed Superset'}
            </ButtonPrimary>
            <Button
              type="button"
              outline
              disabled={refreshDataset.isPending}
              onClick={() => refreshDataset.mutate()}
            >
              {refreshDataset.isPending ? 'Memperbarui…' : 'Refresh dataset'}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
