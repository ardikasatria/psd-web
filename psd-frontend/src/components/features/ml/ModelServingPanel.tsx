'use client'

import type { DriftReport } from '@/lib/api/ml'
import {
  getModelScaling,
  getServingQuota,
  predictModel,
  servingApiBase,
  servingPredictUrl,
  type PredictResult,
} from '@/lib/api/serving'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Select from '@/shared/Select'
import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CpuChipIcon,
  PlayIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

type Props = {
  modelSlug: string
  mlflowName?: string
  hasProductionVersion?: boolean
  driftReports?: DriftReport[]
}

function suggestRetrain(reports: DriftReport[]): boolean {
  const recent = reports.filter((r) => r.status === 'done' && r.drift_status).slice(0, 3)
  return recent.length >= 3 && recent.every((r) => r.drift_status === 'significant')
}

export function ModelServingPanel({
  modelSlug,
  mlflowName,
  hasProductionVersion = true,
  driftReports = [],
}: Props) {
  const [predictInput, setPredictInput] = useState('[[1, 2, 3, 4]]')
  const [stage, setStage] = useState('Production')
  const [predictResult, setPredictResult] = useState<PredictResult | null>(null)
  const [predictError, setPredictError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [rps, setRps] = useState('50')
  const [targetRps, setTargetRps] = useState('10')
  const [minReplicas, setMinReplicas] = useState('1')
  const [maxReplicas, setMaxReplicas] = useState('10')

  const quota = useQuery({
    queryKey: ['serving-quota'],
    queryFn: getServingQuota,
  })

  const scaling = useQuery({
    queryKey: ['model-scaling', modelSlug, rps, targetRps, minReplicas, maxReplicas],
    queryFn: () =>
      getModelScaling(modelSlug, {
        rps: Number(rps) || 0,
        target_rps_per_replica: Number(targetRps) || 10,
        min_replicas: Number(minReplicas) || 1,
        max_replicas: Number(maxReplicas) || 10,
      }),
    enabled: Number(rps) >= 0,
  })

  const predictMutation = useMutation({
    mutationFn: () => {
      let inputs: unknown
      try {
        inputs = JSON.parse(predictInput)
      } catch {
        throw new Error('Input harus JSON valid (array atau objek).')
      }
      return predictModel(modelSlug, { inputs, stage })
    },
    onSuccess: (res) => {
      setPredictError(null)
      setPredictResult(res)
      quota.refetch()
    },
    onError: (e: Error) => {
      setPredictResult(null)
      setPredictError(e.message)
    },
  })

  const curlExample = useMemo(() => {
    let inputs: unknown = []
    try {
      inputs = JSON.parse(predictInput || '[]')
    } catch {
      inputs = []
    }
    const body = JSON.stringify({ inputs, stage })
    return `curl -X POST '${servingPredictUrl(modelSlug)}' \\
  -H 'Content-Type: application/json' \\
  -b 'psd_session=...' \\
  -d '${body}'`
  }, [modelSlug, predictInput, stage])

  const retrainSuggested = suggestRetrain(driftReports)

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlExample)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      {retrainSuggested && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
          Drift signifikan terdeteksi 3 kali berturut-turut — pertimbangkan retraining model Production.
        </div>
      )}

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ServerStackIcon className="size-5 text-violet-500" aria-hidden />
          Endpoint inferensi
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Prediksi terkelola via MLflow registry — kuota per tier gamifikasi (per jam).
        </p>

        <div className="mt-4 rounded-xl bg-neutral-50 p-4 font-mono text-xs dark:bg-neutral-900/50">
          <div className="text-neutral-500">POST</div>
          <div className="mt-1 break-all text-neutral-800 dark:text-neutral-200">
            {servingPredictUrl(modelSlug)}
          </div>
          {mlflowName && (
            <p className="mt-2 text-neutral-500">
              MLflow: <span className="text-neutral-700 dark:text-neutral-300">{mlflowName}</span>
            </p>
          )}
        </div>

        {quota.data && (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            Kuota tier <strong>{quota.data.tier}</strong>: {quota.data.used}/{quota.data.limit} prediksi/jam
            ({quota.data.remaining} tersisa)
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" outline onClick={handleCopyCurl}>
            <ClipboardDocumentIcon className="size-4" aria-hidden />
            {copied ? 'Tersalin' : 'Salin contoh cURL'}
          </Button>
          <Button type="button" outline onClick={() => quota.refetch()}>
            <ArrowPathIcon className="size-4" aria-hidden />
            Refresh kuota
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
        <h2 className="text-lg font-semibold">Playground prediksi</h2>
        {!hasProductionVersion && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            Belum ada versi Production — daftarkan versi model terlebih dahulu.
          </p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-[140px_1fr]">
          <div>
            <label className="text-xs font-medium text-neutral-500">Stage MLflow</label>
            <Select value={stage} onChange={(e) => setStage(e.target.value)} className="mt-1 !rounded-xl">
              <option value="Production">Production</option>
              <option value="Staging">Staging</option>
              <option value="None">None</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">Input JSON</label>
            <Textarea
              value={predictInput}
              onChange={(e) => setPredictInput(e.target.value)}
              rows={4}
              className="mt-1 font-mono text-xs"
              placeholder='[[1, 2, 3]]'
            />
          </div>
        </div>
        {predictError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {predictError}
          </p>
        )}
        <ButtonPrimary
          type="button"
          className="mt-4"
          onClick={() => predictMutation.mutate()}
          disabled={predictMutation.isPending || !hasProductionVersion}
        >
          <PlayIcon className="size-4" aria-hidden />
          {predictMutation.isPending ? 'Memproses…' : 'Jalankan prediksi'}
        </ButtonPrimary>

        {predictResult && (
          <div className="mt-4 rounded-xl border border-neutral-200/80 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
            <p className="text-xs text-neutral-500">
              Model: <strong>{predictResult.model ?? mlflowName ?? modelSlug}</strong> · Latensi:{' '}
              <strong>{predictResult.latency_ms} ms</strong>
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
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CpuChipIcon className="size-5 text-indigo-500" aria-hidden />
          Autoscaling (estimasi)
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Hitung jumlah replika yang disarankan berdasarkan beban RPS — untuk perencanaan kapasitas serving.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-neutral-500">RPS (permintaan/detik)</label>
            <Input value={rps} onChange={(e) => setRps(e.target.value)} type="number" min={0} className="mt-1 !rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">Target RPS/replika</label>
            <Input
              value={targetRps}
              onChange={(e) => setTargetRps(e.target.value)}
              type="number"
              min={1}
              className="mt-1 !rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">Min replika</label>
            <Input
              value={minReplicas}
              onChange={(e) => setMinReplicas(e.target.value)}
              type="number"
              min={1}
              className="mt-1 !rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">Max replika</label>
            <Input
              value={maxReplicas}
              onChange={(e) => setMaxReplicas(e.target.value)}
              type="number"
              min={1}
              className="mt-1 !rounded-xl"
            />
          </div>
        </div>

        {scaling.isLoading && <p className="mt-3 text-sm text-neutral-500">Menghitung…</p>}
        {scaling.isError && (
          <p className="mt-3 text-sm text-neutral-500">
            Estimasi scaling tidak tersedia — pastikan serving aktif di lingkungan ini.
          </p>
        )}
        {scaling.data && (
          <div className="mt-4 rounded-xl border border-indigo-200/80 bg-indigo-50/50 px-4 py-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
            <p className="text-sm text-indigo-900 dark:text-indigo-200">
              Untuk <strong>{scaling.data.rps} RPS</strong>, disarankan{' '}
              <strong>{scaling.data.desired_replicas}</strong> replika
              <span className="text-indigo-700/80 dark:text-indigo-300/80">
                {' '}
                (model: {scaling.data.model})
              </span>
            </p>
          </div>
        )}
      </section>

      <p className="text-xs text-neutral-500">
        Base API: {servingApiBase()} · Autentikasi via cookie sesi PSD (login di browser atau sesi API).
      </p>
    </div>
  )
}
