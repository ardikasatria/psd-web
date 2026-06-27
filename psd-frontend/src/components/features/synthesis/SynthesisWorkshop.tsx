'use client'

import { darkPanelClass, darkPanelLgClass, synthesisGradient } from '@/components/common/featureGradients'
import { SyntheticBadge } from '@/components/common/SyntheticBadge'
import { QueryState } from '@/components/features/QueryState'
import {
  createSynthJob,
  getMySynthJobs,
  getSynthJob,
  getSynthQuota,
  publishSynthDataset,
} from '@/lib/api/synthesis'
import { SynthJob, SynthQuota } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Select from '@/shared/Select'
import { Field, Label } from '@/shared/fieldset'
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useMemo, useState } from 'react'

const DTYPES = [
  'int',
  'float',
  'category',
  'bool',
  'datetime',
  'name',
  'address',
  'city',
  'company',
  'phone',
  'id',
  'text',
  'formula',
] as const

const EXAMPLE_PROMPTS = [
  'Dataset penjualan UMKM di Lampung per bulan dengan kategori produk dan omzet',
  'Ulasan marketplace Bahasa Indonesia dengan rating 1–5 dan label sentimen',
  'Transaksi harian per SKU dengan qty, harga, dan kota di Jawa Timur',
] as const

type ColumnRow = { name: string; dtype: string; params: string }

const STATUS_LABEL: Record<SynthJob['status'], string> = {
  queued: 'Antre',
  planning: 'Merancang (AI)',
  generating: 'Membuat data',
  done: 'Selesai',
  failed: 'Gagal',
}

const DEFAULT_COLUMNS: ColumnRow[] = [
  { name: 'id', dtype: 'id', params: '{}' },
  { name: 'nama', dtype: 'name', params: '{}' },
  { name: 'kota', dtype: 'city', params: '{}' },
]

function parseParams(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || '{}')
  } catch {
    return {}
  }
}

function SpecEditor({
  spec,
  onChange,
}: {
  spec: { name: string; description: string; columns: ColumnRow[] }
  onChange: (s: { name: string; description: string; columns: ColumnRow[] }) => void
}) {
  return (
    <div className={clsx(darkPanelClass, 'space-y-4 p-4')}>
      <Field>
        <Label>Nama dataset</Label>
        <Input value={spec.name} onChange={(e) => onChange({ ...spec, name: e.target.value })} className="!rounded-xl" />
      </Field>
      <Field>
        <Label>Deskripsi</Label>
        <Textarea
          value={spec.description}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          rows={2}
          className="!rounded-xl"
        />
      </Field>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-700">
              <th className="pb-2 pe-2">Kolom</th>
              <th className="pb-2 pe-2">Tipe</th>
              <th className="pb-2">Params (JSON)</th>
            </tr>
          </thead>
          <tbody>
            {spec.columns.map((col, i) => (
              <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800">
                <td className="py-2 pe-2">
                  <Input
                    value={col.name}
                    onChange={(e) => {
                      const columns = [...spec.columns]
                      columns[i] = { ...col, name: e.target.value }
                      onChange({ ...spec, columns })
                    }}
                    className="!rounded-lg font-mono text-xs"
                  />
                </td>
                <td className="py-2 pe-2">
                  <Select
                    value={col.dtype}
                    onChange={(e) => {
                      const columns = [...spec.columns]
                      columns[i] = { ...col, dtype: e.target.value }
                      onChange({ ...spec, columns })
                    }}
                    className="!rounded-lg text-xs"
                  >
                    {DTYPES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="py-2">
                  <Input
                    value={col.params}
                    onChange={(e) => {
                      const columns = [...spec.columns]
                      columns[i] = { ...col, params: e.target.value }
                      onChange({ ...spec, columns })
                    }}
                    className="!rounded-lg font-mono text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ButtonPrimary
        type="button"
        outline
        onClick={() =>
          onChange({ ...spec, columns: [...spec.columns, { name: 'kolom_baru', dtype: 'text', params: '{}' }] })
        }
      >
        + Kolom
      </ButtonPrimary>
    </div>
  )
}

function PreviewTable({ rows }: { rows: Record<string, string>[] }) {
  const cols = rows.length ? Object.keys(rows[0]) : []
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900/40">
      <table className="w-full min-w-[480px] text-sm">
        <thead className="bg-neutral-50 dark:bg-neutral-800/95">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-900/20">
              {cols.map((c) => (
                <td key={c} className="px-3 py-1.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                  {row[c]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type Props = {
  id?: string
}

export function SynthesisWorkshop({ id = 'synthesis-workshop' }: Props) {
  const qc = useQueryClient()

  const [mode, setMode] = useState<'prompt' | 'spec'>('prompt')
  const [prompt, setPrompt] = useState('')
  const [nRows, setNRows] = useState(1000)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [manualSpec, setManualSpec] = useState({
    name: 'Dataset Sintesis',
    description: '',
    columns: DEFAULT_COLUMNS,
  })
  const [editedSpec, setEditedSpec] = useState<{
    name: string
    description: string
    columns: ColumnRow[]
  } | null>(null)
  const [publishName, setPublishName] = useState('')
  const [publishVis, setPublishVis] = useState<'public' | 'private'>('public')

  const quotaQuery = useQuery({
    queryKey: ['synth-quota'],
    queryFn: getSynthQuota,
  })

  const historyQuery = useQuery({
    queryKey: ['my-synth-jobs'],
    queryFn: async () => {
      const res = await getMySynthJobs()
      return res.items as SynthJob[]
    },
  })

  const jobQuery = useQuery({
    queryKey: ['synth-job', activeJobId],
    queryFn: () => getSynthJob(activeJobId!),
    enabled: !!activeJobId,
    refetchInterval: (q) =>
      q.state.data && ['done', 'failed'].includes(q.state.data.status) ? false : 2000,
  })

  const job = jobQuery.data
  const quota = quotaQuery.data as SynthQuota | undefined

  const specForRegen = useMemo(() => {
    if (editedSpec) return editedSpec
    if (job?.spec) {
      const s = job.spec as {
        name: string
        description: string
        columns: Array<{ name: string; dtype: string; params: Record<string, unknown> }>
      }
      return {
        name: s.name,
        description: s.description,
        columns: s.columns.map((c) => ({
          name: c.name,
          dtype: c.dtype,
          params: JSON.stringify(c.params ?? {}),
        })),
      }
    }
    return null
  }, [editedSpec, job?.spec])

  const createJob = useMutation({
    mutationFn: (body: { prompt?: string; spec?: Record<string, unknown>; n_rows: number }) =>
      createSynthJob(body),
    onSuccess: (res) => {
      setActiveJobId(res.job_id)
      qc.invalidateQueries({ queryKey: ['synth-quota'] })
      qc.invalidateQueries({ queryKey: ['my-synth-jobs'] })
    },
  })

  const publish = useMutation({
    mutationFn: () =>
      publishSynthDataset(activeJobId!, {
        name: publishName || undefined,
        visibility: publishVis,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['synth-job', activeJobId] })
      qc.invalidateQueries({ queryKey: ['my-synth-jobs'] })
    },
  })

  const buildSpecPayload = (s: { name: string; description: string; columns: ColumnRow[] }) => ({
    name: s.name,
    description: s.description,
    columns: s.columns.map((c) => ({
      name: c.name,
      dtype: c.dtype,
      params: parseParams(c.params),
    })),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'prompt') {
      createJob.mutate({ prompt: prompt.trim(), n_rows: nRows })
    } else {
      createJob.mutate({ spec: buildSpecPayload(manualSpec), n_rows: nRows })
    }
  }

  const handleRegenerate = () => {
    if (!specForRegen) return
    createJob.mutate({ spec: buildSpecPayload(specForRegen), n_rows: nRows })
  }

  return (
    <div id={id} className="scroll-mt-28 space-y-8">
      <section className={synthesisGradient.workshop}>
        <div className="mb-6 flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-indigo-500 text-white">
            <WrenchScrewdriverIcon className="size-6" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Workshop praktik</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Latihan langsung — mulai dari prompt AI untuk memahami spec, lalu edit manual untuk mengasah skill.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'prompt' as const, label: 'Dari masalah (AI)', hint: '1 kuota/hari' },
                { id: 'spec' as const, label: 'Skema manual', hint: 'Tanpa kuota AI' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={clsx(
                  'rounded-full px-4 py-2 text-sm font-medium transition',
                  mode === m.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-700',
                )}
              >
                {m.label}
                <span className="ml-1.5 text-xs opacity-75">({m.hint})</span>
              </button>
            ))}
          </div>

          {mode === 'prompt' ? (
            <div className="space-y-3">
              <Field>
                <Label>Deskripsikan masalah / kebutuhan data</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="Mis. Dataset penjualan UMKM di Lampung per bulan dengan kategori produk dan omzet"
                  className="!rounded-xl"
                  required
                />
              </Field>
              <div>
                <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">Contoh prompt untuk belajar:</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setPrompt(ex)}
                      className="rounded-full bg-sky-50 px-3 py-1.5 text-left text-xs text-sky-800 transition hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-900/50"
                    >
                      {ex.length > 52 ? `${ex.slice(0, 49)}…` : ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <SpecEditor spec={manualSpec} onChange={setManualSpec} />
          )}

          <Field>
            <Label>Jumlah baris</Label>
            <Input
              type="number"
              min={10}
              max={quota?.max_rows ?? 2000}
              value={nRows}
              onChange={(e) => setNRows(Number(e.target.value))}
              className="max-w-xs !rounded-xl"
            />
          </Field>

          <ButtonPrimary type="submit" disabled={createJob.isPending}>
            {createJob.isPending ? 'Memulai…' : 'Buat dataset'}
          </ButtonPrimary>
        </form>
      </section>

      {activeJobId && job && (
        <section className={clsx(darkPanelLgClass, 'space-y-4 p-6')}>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Job {job.id}</h3>
            <Badge color={job.status === 'done' ? 'green' : job.status === 'failed' ? 'red' : 'zinc'}>
              {STATUS_LABEL[job.status]}
            </Badge>
            <SyntheticBadge />
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            {(['queued', 'planning', 'generating', 'done'] as const).map((s, i) => {
              const order = ['queued', 'planning', 'generating', 'done']
              const active = order.indexOf(job.status) >= i || job.status === 'done'
              return (
                <span
                  key={s}
                  className={clsx(
                    'rounded-full px-2.5 py-0.5',
                    active ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-400',
                  )}
                >
                  {i + 1}. {STATUS_LABEL[s]}
                </span>
              )
            })}
          </div>

          {job.status === 'failed' && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
              {job.error ?? 'Terjadi kesalahan'}
              <div className="mt-3">
                <ButtonPrimary type="button" outline onClick={() => setActiveJobId(null)}>
                  Coba lagi
                </ButtonPrimary>
              </div>
            </div>
          )}

          {job.status === 'done' && (
            <>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Dataset ini <strong>buatan</strong> — bukan data resmi BPS/BMKG atau instansi pemerintah.
              </p>

              {specForRegen && (
                <div className="space-y-3">
                  <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Spesifikasi generator — pelajari & edit</h4>
                  <SpecEditor spec={specForRegen} onChange={(s) => setEditedSpec(s)} />
                  <ButtonPrimary type="button" outline onClick={handleRegenerate} disabled={createJob.isPending}>
                    Buat ulang dengan spec ini (tanpa kuota AI)
                  </ButtonPrimary>
                </div>
              )}

              {job.preview && job.preview.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Pratinjau (20 baris pertama)</h4>
                  <PreviewTable rows={job.preview} />
                </div>
              )}

              {job.result_url && (
                <ButtonPrimary href={job.result_url} target="_blank" rel="noopener noreferrer">
                  Unduh CSV
                </ButtonPrimary>
              )}

              {!job.dataset_slug ? (
                <div className="space-y-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 p-4 dark:border-neutral-600 dark:bg-neutral-900/30">
                  <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Terbitkan sebagai dataset</h4>
                  <Field>
                    <Label>Judul</Label>
                    <Input
                      value={publishName}
                      onChange={(e) => setPublishName(e.target.value)}
                      placeholder={(job.spec as { name?: string })?.name ?? 'Dataset sintesis'}
                      className="!rounded-xl"
                    />
                  </Field>
                  <Field>
                    <Label>Visibilitas</Label>
                    <Select
                      value={publishVis}
                      onChange={(e) => setPublishVis(e.target.value as 'public' | 'private')}
                      className="max-w-xs !rounded-xl"
                    >
                      <option value="public">Publik</option>
                      <option value="private">Privat</option>
                    </Select>
                  </Field>
                  <ButtonPrimary type="button" onClick={() => publish.mutate()} disabled={publish.isPending}>
                    {publish.isPending ? 'Menerbitkan…' : 'Terbitkan dataset'}
                  </ButtonPrimary>
                </div>
              ) : (
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  Sudah diterbitkan:{' '}
                  {(() => {
                    const [owner, ...rest] = job.dataset_slug!.split('/')
                    const name = rest.join('/')
                    return (
                      <Link
                        href={`/datasets/${owner}/${name}`}
                        className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                      >
                        {job.dataset_slug}
                      </Link>
                    )
                  })()}
                </p>
              )}
            </>
          )}
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Riwayat latihan</h3>
        <QueryState
          isLoading={historyQuery.isLoading}
          isError={historyQuery.isError}
          error={historyQuery.error}
          isEmpty={!historyQuery.data?.length}
          emptyTitle="Belum ada job"
          emptyDescription="Buat dataset sintesis pertama Anda di workshop di atas."
          skeletonColumns={2}
        >
          <ul className={clsx(darkPanelClass, 'divide-y divide-neutral-100 dark:divide-neutral-700')}>
            {(historyQuery.data ?? []).map((j: SynthJob) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {j.prompt ?? (j.spec as { name?: string })?.name ?? j.id}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {j.n_rows.toLocaleString('id-ID')} baris · {STATUS_LABEL[j.status]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ButtonPrimary type="button" outline onClick={() => setActiveJobId(j.id)}>
                    Lihat
                  </ButtonPrimary>
                  {j.result_url && j.status === 'done' && (
                    <ButtonPrimary href={j.result_url} target="_blank" rel="noopener noreferrer" outline>
                      CSV
                    </ButtonPrimary>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </QueryState>
      </section>
    </div>
  )
}
