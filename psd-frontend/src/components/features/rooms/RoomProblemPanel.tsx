'use client'

import { SyntheticBadge } from '@/components/common/SyntheticBadge'
import {
  editProblem,
  frameProblem,
  generateData,
  getProblem,
} from '@/lib/api/rooms'
import { getRepos } from '@/lib/api/repos'
import { getSynthQuota } from '@/lib/api/synthesis'
import { RoomProblem } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Select from '@/shared/Select'
import { Field, Label } from '@/shared/fieldset'
import {
  ArrowPathIcon,
  BeakerIcon,
  CloudArrowDownIcon,
  DocumentMagnifyingGlassIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

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

type ColumnRow = { name: string; dtype: string; params: string }

type DataSpecDraft = { name: string; description: string; columns: ColumnRow[] }

function parseParams(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || '{}')
  } catch {
    return {}
  }
}

function specFromProblem(p: RoomProblem): DataSpecDraft {
  const spec = p.data_spec as DataSpecDraft | null
  return {
    name: spec?.name ?? '',
    description: spec?.description ?? '',
    columns: (spec?.columns ?? []).map((c) => ({
      name: c.name ?? '',
      dtype: c.dtype ?? 'text',
      params: typeof c.params === 'string' ? c.params : JSON.stringify(c.params ?? {}),
    })),
  }
}

function SpecEditor({
  spec,
  onChange,
}: {
  spec: DataSpecDraft
  onChange: (s: DataSpecDraft) => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800/60">
      <Field>
        <Label>Nama dataset</Label>
        <Input
          value={spec.name}
          onChange={(e) => onChange({ ...spec, name: e.target.value })}
          className="!rounded-xl"
        />
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
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:border-neutral-700">
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
      <button
        type="button"
        onClick={() =>
          onChange({
            ...spec,
            columns: [...spec.columns, { name: '', dtype: 'text', params: '{}' }],
          })
        }
        className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
      >
        + Tambah kolom
      </button>
    </div>
  )
}

export function RoomProblemPanel({
  slug,
  generationError,
  onGenerated,
}: {
  slug: string
  generationError?: string | null
  onGenerated: () => void
}) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState<RoomProblem | null>(null)
  const [specDraft, setSpecDraft] = useState<DataSpecDraft>({ name: '', description: '', columns: [] })
  const [dataMode, setDataMode] = useState<'synthetic' | 'secondary' | 'collect'>('synthetic')
  const [nRows, setNRows] = useState('1000')
  const [secondarySlug, setSecondarySlug] = useState('')
  const [panelError, setPanelError] = useState<string | null>(null)

  const quotaQuery = useQuery({
    queryKey: ['synth-quota'],
    queryFn: getSynthQuota,
  })

  const problemQuery = useQuery({
    queryKey: ['idea-room-problem', slug],
    queryFn: () => getProblem(slug),
    retry: false,
  })

  const datasetsQuery = useQuery({
    queryKey: ['datasets-picker'],
    queryFn: () => getRepos('dataset', { page_size: 20, sort: 'recent' }),
    enabled: dataMode === 'secondary',
  })

  useEffect(() => {
    if (problemQuery.data) {
      setDraft(problemQuery.data)
      setSpecDraft(specFromProblem(problemQuery.data))
      if (problemQuery.data.data_kind === 'unstructured') {
        setDataMode('collect')
      }
    }
  }, [problemQuery.data])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['idea-room-problem', slug] })
    qc.invalidateQueries({ queryKey: ['idea-room', slug] })
  }

  const frameMut = useMutation({
    mutationFn: () => frameProblem(slug),
    onSuccess: (p) => {
      setPanelError(null)
      setDraft(p)
      setSpecDraft(specFromProblem(p))
      if (p.data_kind === 'unstructured') setDataMode('collect')
      invalidate()
      quotaQuery.refetch()
    },
    onError: (e: Error) => setPanelError(e.message),
  })

  const saveMut = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error('Tidak ada masalah')
      const body: Partial<RoomProblem> = {
        statement_md: draft.statement_md,
        suggested_metric: draft.suggested_metric,
        data_kind: draft.data_kind,
        unstructured_guidance_md: draft.unstructured_guidance_md,
      }
      if (draft.data_kind === 'structured') {
        body.data_spec = {
          name: specDraft.name,
          description: specDraft.description,
          columns: specDraft.columns.map((c) => ({
            name: c.name,
            dtype: c.dtype,
            params: parseParams(c.params),
          })),
        }
      }
      return editProblem(slug, body)
    },
    onSuccess: (p) => {
      setPanelError(null)
      setDraft(p)
      setSpecDraft(specFromProblem(p))
      invalidate()
    },
    onError: (e: Error) => setPanelError(e.message),
  })

  const generateMut = useMutation({
    mutationFn: () => {
      if (dataMode === 'synthetic') {
        return generateData(slug, { data_mode: 'synthetic', n_rows: Number(nRows) || 1000 })
      }
      if (dataMode === 'secondary') {
        return generateData(slug, { data_mode: 'secondary', secondary_dataset_slug: secondarySlug })
      }
      return generateData(slug, { data_mode: 'collect' })
    },
    onSuccess: () => {
      setPanelError(null)
      onGenerated()
      invalidate()
    },
    onError: (e: Error) => setPanelError(e.message),
  })

  const quota = quotaQuery.data
  const hasProblem = !!draft || problemQuery.isSuccess

  return (
    <div className="space-y-6 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/80 to-indigo-50/50 p-5 dark:border-violet-800/50 dark:from-violet-950/30 dark:to-indigo-950/20">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
        <DocumentMagnifyingGlassIcon className="size-4" aria-hidden />
        Ramu Masalah &amp; Hasilkan Data
      </div>

      {generationError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          Generasi gagal: {generationError}
        </p>
      )}

      {panelError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {panelError}
        </p>
      )}

      {/* Tahap A */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Tahap A — Ramu masalah
        </h3>
        {!hasProblem && (
          <div className="space-y-3">
            {quota && (
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Kuota AI hari ini: {quota.plans_used}/{quota.plans_per_day} ramuan
                {quota.plans_left <= 0 && ' — kuota habis, naik tier untuk lebih banyak.'}
              </p>
            )}
            <ButtonPrimary
              type="button"
              disabled={frameMut.isPending || (quota != null && quota.plans_left <= 0)}
              onClick={() => frameMut.mutate()}
            >
              <SparklesIcon className="size-4" aria-hidden />
              {frameMut.isPending ? 'Meramu…' : 'Ramu masalah dengan AI'}
            </ButtonPrimary>
          </div>
        )}

        {hasProblem && draft && (
          <div className="space-y-4">
            <Field>
              <Label>Pernyataan masalah</Label>
              <Textarea
                value={draft.statement_md}
                onChange={(e) => setDraft({ ...draft, statement_md: e.target.value })}
                rows={5}
                className="!rounded-xl"
              />
            </Field>
            <Field>
              <Label>Metrik usulan</Label>
              <Input
                value={draft.suggested_metric ?? ''}
                onChange={(e) => setDraft({ ...draft, suggested_metric: e.target.value || null })}
                className="!rounded-xl"
              />
            </Field>

            {draft.data_kind === 'structured' ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Spesifikasi data (structured)
                </p>
                <SpecEditor spec={specDraft} onChange={setSpecDraft} />
              </div>
            ) : (
              <Field>
                <Label>Panduan pengumpulan data (unstructured)</Label>
                <Textarea
                  value={draft.unstructured_guidance_md ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, unstructured_guidance_md: e.target.value || null })
                  }
                  rows={6}
                  className="!rounded-xl"
                />
              </Field>
            )}

            <div className="flex flex-wrap gap-2">
              <ButtonPrimary type="button" outline disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
                {saveMut.isPending ? 'Menyimpan…' : 'Simpan suntingan'}
              </ButtonPrimary>
              <ButtonPrimary
                type="button"
                outline
                disabled={frameMut.isPending}
                onClick={() => frameMut.mutate()}
              >
                <ArrowPathIcon className="size-4" aria-hidden />
                Ramu ulang dengan AI
              </ButtonPrimary>
            </div>
          </div>
        )}
      </section>

      {/* Tahap B */}
      {hasProblem && draft && (
        <section className="space-y-4 border-t border-violet-200/60 pt-5 dark:border-violet-800/40">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Tahap B — Hasilkan data
          </h3>

          {draft.data_kind === 'structured' ? (
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'synthetic' as const, label: 'Sintesis', icon: BeakerIcon },
                  { id: 'secondary' as const, label: 'Data sekunder', icon: CloudArrowDownIcon },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setDataMode(m.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    dataMode === m.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-white text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-600'
                  }`}
                >
                  <m.icon className="size-3.5" aria-hidden />
                  {m.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Data tak terstruktur — tim akan mengumpulkan data sendiri berpandu rekomendasi AI.
            </p>
          )}

          {dataMode === 'synthetic' && draft.data_kind === 'structured' && (
            <Field>
              <Label>Jumlah baris (maks. {quota?.max_rows?.toLocaleString('id-ID') ?? '—'})</Label>
              <Input
                type="number"
                min={100}
                max={quota?.max_rows ?? 2000}
                value={nRows}
                onChange={(e) => setNRows(e.target.value)}
                className="!rounded-xl w-40"
              />
            </Field>
          )}

          {dataMode === 'secondary' && draft.data_kind === 'structured' && (
            <Field>
              <Label>Dataset sumber</Label>
              <Select
                value={secondarySlug}
                onChange={(e) => setSecondarySlug(e.target.value)}
                className="!rounded-xl"
              >
                <option value="">— Pilih dataset —</option>
                {(datasetsQuery.data?.items ?? []).map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.name} ({d.slug})
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <ButtonPrimary
            type="button"
            disabled={
              generateMut.isPending ||
              (dataMode === 'secondary' && !secondarySlug) ||
              (dataMode === 'synthetic' && draft.data_kind !== 'structured')
            }
            onClick={() => generateMut.mutate()}
          >
            {generateMut.isPending
              ? 'Memproses…'
              : dataMode === 'collect' || draft.data_kind === 'unstructured'
                ? 'Lanjut ke fase pengumpulan'
                : dataMode === 'secondary'
                  ? 'Tautkan dataset sekunder'
                  : 'Hasilkan data sintesis'}
          </ButtonPrimary>
        </section>
      )}
    </div>
  )
}

export function RoomSolvingView({
  slug,
  dataMode,
  datasetRepoSlug,
}: {
  slug: string
  dataMode?: string | null
  datasetRepoSlug?: string | null
}) {
  const problemQuery = useQuery({
    queryKey: ['idea-room-problem', slug],
    queryFn: () => getProblem(slug),
    retry: false,
  })

  const p = problemQuery.data
  if (problemQuery.isLoading) {
    return <p className="text-sm text-neutral-500">Memuat pernyataan masalah…</p>
  }
  if (!p) return null

  const datasetPath = datasetRepoSlug?.split('/')
  const datasetHref =
    datasetPath?.length === 2 ? `/datasets/${datasetPath[0]}/${datasetPath[1]}` : null

  return (
    <div className="space-y-5 rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-5 dark:border-indigo-800/50 dark:bg-indigo-950/20">
      <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Pernyataan masalah</h2>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        {p.statement_md}
      </pre>
      {p.suggested_metric && (
        <p className="text-sm">
          <span className="font-medium text-neutral-600 dark:text-neutral-400">Metrik: </span>
          {p.suggested_metric}
        </p>
      )}

      {dataMode === 'collect' && p.unstructured_guidance_md && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
          <h3 className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
            Panduan pengumpulan data
          </h3>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-amber-950/90 dark:text-amber-100/90">
            {p.unstructured_guidance_md}
          </pre>
        </div>
      )}

      {datasetHref && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Dataset:</span>
          <a
            href={datasetHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
          >
            {datasetRepoSlug}
            {dataMode === 'synthetic' && <SyntheticBadge />}
          </a>
        </div>
      )}

      {dataMode === 'secondary' && datasetRepoSlug && !datasetHref && (
        <p className="text-sm text-neutral-600">
          Dataset tertaut: <code className="text-xs">{datasetRepoSlug}</code>
        </p>
      )}
    </div>
  )
}

export function RoomGeneratingBanner() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-cyan-200/80 bg-cyan-50/60 px-5 py-4 dark:border-cyan-800/50 dark:bg-cyan-950/20">
      <ArrowPathIcon className="size-5 animate-spin text-cyan-600 dark:text-cyan-400" aria-hidden />
      <div>
        <p className="text-sm font-medium text-cyan-900 dark:text-cyan-100">Membuat data…</p>
        <p className="text-xs text-cyan-700/80 dark:text-cyan-300/80">
          Mesin sintesis sedang menghasilkan dataset untuk ruang ini.
        </p>
      </div>
    </div>
  )
}

export function RoomClosedMemberBanner() {
  return (
    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 px-5 py-4 dark:border-amber-800/50 dark:bg-amber-950/20">
      <p className="text-sm text-amber-900 dark:text-amber-200">
        Master sedang menyiapkan masalah &amp; data. Anda akan diberitahu saat fase penyelesaian dimulai.
      </p>
    </div>
  )
}
