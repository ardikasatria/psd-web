'use client'

import { DriftStatusBadge } from '@/components/features/ml/DriftStatusBadge'
import { QueryState } from '@/components/features/QueryState'
import {
  createMonitoringDashboard,
  getModelRegistry,
  listDriftReports,
  mlflowPublicUrl,
  runDriftCheck,
} from '@/lib/api/ml'
import { getServingQuota, predictModel } from '@/lib/api/serving'
import type { DriftReport, ModelRegistryDetail } from '@/lib/api/ml'
import type { PredictResult, ServingQuota } from '@/lib/api/serving'
import { normalizeDriftStatus } from '@/lib/ml/driftStatus'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { ArrowTopRightOnSquareIcon, ChartBarSquareIcon, PlayIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import clsx from 'clsx'

type Props = {
  slug: string
}

const JOB_STATUS_LABEL: Record<string, string> = {
  queued: 'Antrian',
  running: 'Berjalan',
  done: 'Selesai',
  error: 'Gagal',
}

function DriftReportCard({ report }: { report: DriftReport }) {
  const driftStatus = normalizeDriftStatus(report.drift_status)
  const features = report.feature_drift ?? []

  return (
    <li className="rounded-xl border border-neutral-200/80 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 px-4 py-3 dark:border-neutral-700">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-neutral-500">{report.id}</p>
          {report.created_at && (
            <p className="mt-0.5 text-xs text-neutral-400">
              {new Date(report.created_at).toLocaleString('id-ID')}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={clsx(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              report.status === 'done' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
              report.status === 'error' && 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
              (report.status === 'queued' || report.status === 'running') &&
                'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
            )}
          >
            {JOB_STATUS_LABEL[report.status] ?? report.status}
          </span>
          {report.status === 'done' && report.drift_status && <DriftStatusBadge status={driftStatus} />}
        </div>
      </div>

      {report.status === 'done' && (
        <div className="space-y-3 px-4 py-3">
          <div className="flex flex-wrap gap-4 text-sm text-neutral-700 dark:text-neutral-300">
            {report.overall_psi != null && (
              <span>
                PSI maks: <strong>{report.overall_psi.toFixed(4)}</strong>
              </span>
            )}
            {report.accuracy != null && (
              <span>
                Akurasi: <strong>{(report.accuracy * 100).toFixed(1)}%</strong>
              </span>
            )}
            {(report.alert_count ?? 0) > 0 && (
              <span className="text-red-700 dark:text-red-300">{report.alert_count} alert signifikan</span>
            )}
          </div>

          {features.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-800">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-700">
                    <th className="px-3 py-2 font-semibold">Fitur</th>
                    <th className="px-3 py-2 font-semibold">PSI</th>
                    <th className="px-3 py-2 font-semibold">Status drift</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((f) => (
                    <tr key={f.feature} className="border-b border-neutral-100 last:border-0 dark:border-neutral-700/80">
                      <td className="px-3 py-2 font-mono text-xs">{f.feature}</td>
                      <td className="px-3 py-2">{f.psi.toFixed(4)}</td>
                      <td className="px-3 py-2">
                        <DriftStatusBadge status={normalizeDriftStatus(f.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {report.status === 'error' && report.error && (
        <p className="px-4 py-3 text-sm text-red-600 dark:text-red-400">{report.error}</p>
      )}
    </li>
  )
}

export function MlRegistryDetailContent({ slug }: Props) {
  const qc = useQueryClient()
  const [currentSourceId, setCurrentSourceId] = useState('')
  const [predictInput, setPredictInput] = useState('[[1, 2, 3, 4]]')
  const [predictResult, setPredictResult] = useState<PredictResult | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const servingQuota = useQuery<ServingQuota>({
    queryKey: ['serving-quota'],
    queryFn: getServingQuota,
  })

  const { data, isLoading, isError, error } = useQuery<ModelRegistryDetail>({
    queryKey: ['ml-registry', slug],
    queryFn: () => getModelRegistry(slug),
  })

  const drift = useQuery({
    queryKey: ['ml-drift', slug],
    queryFn: () => listDriftReports(slug),
    enabled: Boolean(data),
  })

  const driftMutation = useMutation({
    mutationFn: () => runDriftCheck(slug, { current_source_id: currentSourceId || undefined }),
    onSuccess: () => {
      setActionError(null)
      qc.invalidateQueries({ queryKey: ['ml-drift', slug] })
      qc.invalidateQueries({ queryKey: ['ml-registry', slug] })
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const monitoringMutation = useMutation({
    mutationFn: () => createMonitoringDashboard(slug),
    onSuccess: () => {
      setActionError(null)
      qc.invalidateQueries({ queryKey: ['ml-registry', slug] })
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const predictMutation = useMutation({
    mutationFn: () => {
      let inputs: unknown
      try {
        inputs = JSON.parse(predictInput)
      } catch {
        throw new Error('Input harus JSON valid (array atau objek).')
      }
      return predictModel(slug, { inputs, stage: 'Production' })
    },
    onSuccess: (res) => {
      setActionError(null)
      setPredictResult(res)
      qc.invalidateQueries({ queryKey: ['serving-quota'] })
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const latestDrift = drift.data?.items.find((r) => r.status === 'done' && r.drift_status)

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="text-sm text-neutral-500">
        <Link href="/ml" className="hover:text-primary-600">
          Registry Model
        </Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-800 dark:text-neutral-200">{data?.title ?? slug}</span>
      </div>

      <QueryState isLoading={isLoading} isError={isError} error={error} skeletonColumns={1}>
        {data && (
          <>
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{data.title}</h1>
                  <p className="mt-1 font-mono text-sm text-neutral-500">{data.mlflow_name}</p>
                </div>
                {latestDrift?.drift_status && (
                  <div className="text-right">
                    <p className="text-xs text-neutral-500">Drift terbaru</p>
                    <DriftStatusBadge status={normalizeDriftStatus(latestDrift.drift_status)} className="mt-1" />
                  </div>
                )}
              </div>
              {data.description_md && (
                <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{data.description_md}</p>
              )}
              {(data.features?.length ?? 0) > 0 && (
                <p className="mt-3 text-xs text-neutral-500">
                  Fitur dipantau: {data.features!.map((f) => f.name).join(', ')}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={mlflowPublicUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-violet-700 hover:underline dark:text-violet-300"
                >
                  Buka MLflow UI
                  <ArrowTopRightOnSquareIcon className="size-4" aria-hidden />
                </a>
                {data.monitoring_dashboard_slug ? (
                  <Link
                    href={`/analytics/${data.monitoring_dashboard_slug}`}
                    className="inline-flex items-center gap-1 text-sm text-rose-700 hover:underline dark:text-rose-300"
                  >
                    <ChartBarSquareIcon className="size-4" aria-hidden />
                    Dashboard monitoring
                  </Link>
                ) : (
                  <Button
                    type="button"
                    onClick={() => monitoringMutation.mutate()}
                    disabled={monitoringMutation.isPending}
                  >
                    Buat dashboard monitoring
                  </Button>
                )}
              </div>
            </div>

            <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
              <h2 className="text-lg font-semibold">Versi model</h2>
              <ul className="mt-4 space-y-3">
                {data.versions.length === 0 ? (
                  <li className="text-sm text-neutral-500">Belum ada versi terdaftar.</li>
                ) : (
                  data.versions.map((v) => (
                    <li key={v.id} className="rounded-xl border border-neutral-100 p-4 dark:border-neutral-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">v{v.version}</span>
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                          {v.stage !== 'None' && <span>Stage: {v.stage}</span>}
                          {v.mlflow_model_version && <span>MLflow v{v.mlflow_model_version}</span>}
                        </div>
                      </div>
                      {Object.keys(v.metrics).length > 0 && (
                        <pre className="mt-2 overflow-x-auto text-xs text-neutral-600 dark:text-neutral-400">
                          {JSON.stringify(v.metrics, null, 2)}
                        </pre>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
              <h2 className="text-lg font-semibold">Inferensi (serving)</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Uji prediksi dari model Production di registry. Kuota per tier gamifikasi.
              </p>
              {servingQuota.data && (
                <p className="mt-2 text-xs text-neutral-500">
                  Kuota tier <strong>{servingQuota.data.tier}</strong>:{' '}
                  {servingQuota.data.used}/{servingQuota.data.limit} per jam ({servingQuota.data.remaining}{' '}
                  tersisa)
                </p>
              )}
              <div className="mt-4 space-y-3">
                <Textarea
                  value={predictInput}
                  onChange={(e) => setPredictInput(e.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                  placeholder='[[1, 2, 3]]'
                />
                <ButtonPrimary
                  type="button"
                  onClick={() => predictMutation.mutate()}
                  disabled={predictMutation.isPending}
                >
                  <PlayIcon className="size-4" aria-hidden />
                  {predictMutation.isPending ? 'Memproses…' : 'Jalankan prediksi'}
                </ButtonPrimary>
              </div>
              {predictResult && (
                <div className="mt-4 rounded-xl border border-neutral-200/80 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
                  <p className="text-xs text-neutral-500">
                    Latensi: <strong>{predictResult.latency_ms} ms</strong>
                    {predictResult.quota && (
                      <>
                        {' '}
                        · Kuota tersisa: <strong>{predictResult.quota.remaining}</strong>
                      </>
                    )}
                  </p>
                  <pre className="mt-2 overflow-x-auto text-xs text-neutral-700 dark:text-neutral-300">
                    {JSON.stringify(predictResult.prediction, null, 2)}
                  </pre>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
              <h2 className="text-lg font-semibold">Drift monitoring</h2>
              <p className="mt-1 text-sm text-neutral-500">
                PSI per fitur — status <strong>stabil</strong> (&lt;0.1), <strong>sedang</strong> (0.1–0.25),{' '}
                <strong>signifikan</strong> (&gt;0.25).
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Input
                  value={currentSourceId}
                  onChange={(e) => setCurrentSourceId(e.target.value)}
                  placeholder="current_source_id (src_...)"
                  className="max-w-xs"
                />
                <ButtonPrimary
                  type="button"
                  onClick={() => driftMutation.mutate()}
                  disabled={driftMutation.isPending || !currentSourceId}
                >
                  Jalankan cek drift
                </ButtonPrimary>
              </div>
              {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
              <ul className="mt-6 space-y-3">
                {(drift.data?.items ?? []).length === 0 ? (
                  <li className="text-sm text-neutral-500">Belum ada laporan drift.</li>
                ) : (
                  drift.data!.items.map((r) => <DriftReportCard key={r.id} report={r} />)
                )}
              </ul>
            </section>
          </>
        )}
      </QueryState>
    </div>
  )
}
