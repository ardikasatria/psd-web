'use client'

import {
  createJob,
  previewJob,
  runJob,
  type HarvestJobPayload,
} from '@/lib/api/harvest'
import { getRepos } from '@/lib/api/repos'
import { ApiError } from '@/lib/api/client'
import { getApiErrorMessage } from '@/lib/api/errors'
import { harvestErrorHint, validateHttpsUrl } from '@/components/features/harvest/harvest-utils'
import { useAuth } from '@/lib/auth/useAuth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { CheckIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

const STEPS = ['Sumber', 'Paginasi', 'Pemetaan', 'Dataset', 'Tinjau'] as const

type ParamRow = { key: string; value: string }
type MapRow = { out: string; src: string }

const EMPTY_FORM: HarvestJobPayload = {
  name: '',
  source_url: '',
  method: 'GET',
  params: {},
  auth_type: 'none',
  pagination: 'none',
  page_size: 50,
  max_pages: 10,
  max_records: 500,
  records_path: '',
  cursor_path: '',
  field_map: null,
  rate_per_min: 30,
  output_mode: 'new',
  output_format: 'csv',
  dataset_slug: null,
}

type Props = {
  open: boolean
  onClose: () => void
}

export function HarvestWizardDialog({ open, onClose }: Props) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<HarvestJobPayload>({ ...EMPTY_FORM })
  const [params, setParams] = useState<ParamRow[]>([{ key: '', value: '' }])
  const [authSecret, setAuthSecret] = useState('')
  const [authUser, setAuthUser] = useState('')
  const [authHeader, setAuthHeader] = useState('X-API-Key')
  const [fieldRows, setFieldRows] = useState<MapRow[]>([])
  const [skipMapping, setSkipMapping] = useState(true)
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[] | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  const datasets = useQuery({
    queryKey: ['harvest-wizard-datasets'],
    queryFn: () => getRepos('dataset', { page_size: 50 }),
    enabled: open && form.output_mode === 'version',
  })

  const myDatasets = useMemo(() => {
    const items = datasets.data?.items ?? []
    if (!user?.username) return items
    return items.filter((d) => d.owner.username === user.username)
  }, [datasets.data, user?.username])

  function buildPayload(): HarvestJobPayload {
    const paramObj: Record<string, string> = {}
    for (const p of params) {
      if (p.key.trim()) paramObj[p.key.trim()] = p.value
    }
    const field_map: Record<string, string> | null = skipMapping
      ? null
      : Object.fromEntries(fieldRows.filter((r) => r.out && r.src).map((r) => [r.out, r.src]))
    const auth: Record<string, string> | undefined =
      form.auth_type === 'none'
        ? undefined
        : form.auth_type === 'basic'
          ? { username: authUser, password: authSecret }
          : form.auth_type === 'api_key'
            ? { header: authHeader, key: authSecret }
            : { token: authSecret }

    return {
      ...form,
      name: form.name.trim(),
      source_url: form.source_url.trim(),
      params: paramObj,
      records_path: form.records_path?.trim() || null,
      cursor_path: form.cursor_path?.trim() || null,
      field_map,
      auth,
    }
  }

  const previewMut = useMutation({
    mutationFn: () => previewJob(buildPayload()),
    onSuccess: (res) => {
      setPreviewRows(res.rows)
      setError(null)
      setErrorCode(null)
      if (!skipMapping && fieldRows.length === 0 && res.rows[0]) {
        setFieldRows(
          Object.keys(res.rows[0]).map((k) => ({ out: k, src: k })),
        )
      }
    },
    onError: (e) => {
      setPreviewRows(null)
      setError(getApiErrorMessage(e))
      setErrorCode(e instanceof ApiError ? e.code : null)
    },
  })

  const submitMut = useMutation({
    mutationFn: async () => {
      const payload = buildPayload()
      const job = await createJob(payload)
      await runJob(job.id)
      return job
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harvest-jobs'] })
      handleClose()
    },
    onError: (e) => {
      setError(getApiErrorMessage(e))
      setErrorCode(e instanceof ApiError ? e.code : null)
    },
  })

  function handleClose() {
    setStep(0)
    setForm({ ...EMPTY_FORM })
    setParams([{ key: '', value: '' }])
    setAuthSecret('')
    setAuthUser('')
    setFieldRows([])
    setSkipMapping(true)
    setPreviewRows(null)
    setUrlError(null)
    setError(null)
    setErrorCode(null)
    onClose()
  }

  function validateStep(): boolean {
    setError(null)
    setErrorCode(null)
    if (step === 0) {
      if (!form.name.trim()) {
        setError('Nama job wajib diisi')
        return false
      }
      const uErr = validateHttpsUrl(form.source_url)
      if (uErr) {
        setUrlError(uErr)
        return false
      }
      setUrlError(null)
    }
    if (step === 3) {
      if (form.output_mode === 'version' && !form.dataset_slug) {
        setError('Pilih dataset tujuan')
        return false
      }
    }
    return true
  }

  function next() {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function back() {
    setError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

  const hint = harvestErrorHint(errorCode ?? undefined)

  return (
    <Dialog open={open} onClose={handleClose} size="2xl">
      <DialogTitle>Job panen baru</DialogTitle>
      <DialogBody className="space-y-6">
        <nav className="flex flex-wrap gap-1">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => i < step && setStep(i)}
              className={clsx(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition',
                i === step
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : i < step
                    ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400'
                    : 'text-neutral-400 dark:text-neutral-500',
              )}
            >
              {i < step && <CheckIcon className="size-3" />}
              {i + 1}. {label}
            </button>
          ))}
        </nav>

        {step === 0 && (
          <div className="space-y-4">
            <Field>
              <Label>Nama job</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Panen Post JSONPlaceholder"
              />
            </Field>
            <Field>
              <Label>URL API (https)</Label>
              <Input
                value={form.source_url}
                onChange={(e) => {
                  setForm((f) => ({ ...f, source_url: e.target.value }))
                  setUrlError(null)
                }}
                placeholder="https://jsonplaceholder.typicode.com/posts"
                className="font-mono text-sm"
              />
              {urlError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{urlError}</p>}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label>Metode HTTP</Label>
                <select
                  value={form.method}
                  onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </Field>
              <Field>
                <Label>Autentikasi</Label>
                <select
                  value={form.auth_type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      auth_type: e.target.value as HarvestJobPayload['auth_type'],
                    }))
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                >
                  <option value="none">Tidak ada</option>
                  <option value="api_key">API Key</option>
                  <option value="bearer">Bearer token</option>
                  <option value="basic">Basic auth</option>
                </select>
              </Field>
            </div>
            {form.auth_type === 'api_key' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <Label>Header</Label>
                  <Input value={authHeader} onChange={(e) => setAuthHeader(e.target.value)} />
                </Field>
                <Field>
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={authSecret}
                    onChange={(e) => setAuthSecret(e.target.value)}
                    placeholder="Tidak ditampilkan ulang setelah simpan"
                  />
                </Field>
              </div>
            )}
            {form.auth_type === 'bearer' && (
              <Field>
                <Label>Bearer token</Label>
                <Input
                  type="password"
                  value={authSecret}
                  onChange={(e) => setAuthSecret(e.target.value)}
                />
              </Field>
            )}
            {form.auth_type === 'basic' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <Label>Username</Label>
                  <Input value={authUser} onChange={(e) => setAuthUser(e.target.value)} />
                </Field>
                <Field>
                  <Label>Password</Label>
                  <Input type="password" value={authSecret} onChange={(e) => setAuthSecret(e.target.value)} />
                </Field>
              </div>
            )}
            <Field>
              <Label>Parameter query</Label>
              <ul className="mt-2 space-y-2">
                {params.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <Input
                      value={p.key}
                      onChange={(e) => {
                        const next = [...params]
                        next[i] = { ...next[i]!, key: e.target.value }
                        setParams(next)
                      }}
                      placeholder="key"
                      className="font-mono text-sm"
                    />
                    <Input
                      value={p.value}
                      onChange={(e) => {
                        const next = [...params]
                        next[i] = { ...next[i]!, value: e.target.value }
                        setParams(next)
                      }}
                      placeholder="value"
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      plain
                      onClick={() => setParams(params.filter((_, j) => j !== i))}
                      aria-label="Hapus"
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                plain
                className="mt-2 !text-sm"
                onClick={() => setParams([...params, { key: '', value: '' }])}
              >
                <PlusIcon className="size-4" />
                Tambah parameter
              </Button>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field>
              <Label>Strategi paginasi</Label>
              <select
                value={form.pagination}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pagination: e.target.value as HarvestJobPayload['pagination'],
                  }))
                }
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
              >
                <option value="none">Tidak ada (satu permintaan)</option>
                <option value="page">Page number</option>
                <option value="offset">Offset</option>
                <option value="cursor">Cursor</option>
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label>Page size</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.page_size ?? 50}
                  onChange={(e) => setForm((f) => ({ ...f, page_size: Number(e.target.value) }))}
                />
              </Field>
              <Field>
                <Label>Rate limit (req/menit)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.rate_per_min ?? 30}
                  onChange={(e) => setForm((f) => ({ ...f, rate_per_min: Number(e.target.value) }))}
                />
              </Field>
              <Field>
                <Label>Max halaman</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_pages ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      max_pages: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </Field>
              <Field>
                <Label>Max record</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_records ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      max_records: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </Field>
            </div>
            <Field>
              <Label>Records path (opsional)</Label>
              <Input
                value={form.records_path ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, records_path: e.target.value }))}
                placeholder="data.items"
                className="font-mono text-sm"
              />
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Path JSON ke array record, mis. <code>data.items</code>
              </p>
            </Field>
            {form.pagination === 'cursor' && (
              <Field>
                <Label>Cursor path</Label>
                <Input
                  value={form.cursor_path ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, cursor_path: e.target.value }))}
                  placeholder="meta.next_cursor"
                  className="font-mono text-sm"
                />
              </Field>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={skipMapping}
                onChange={(e) => setSkipMapping(e.target.checked)}
                className="rounded border-neutral-300"
              />
              Lewati pemetaan — ambil field apa adanya dari respons
            </label>
            {!skipMapping && (
              <Field>
                <Label>Pemetaan kolom</Label>
                <ul className="mt-2 space-y-2">
                  {fieldRows.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <Input
                        value={r.out}
                        onChange={(e) => {
                          const next = [...fieldRows]
                          next[i] = { ...next[i]!, out: e.target.value }
                          setFieldRows(next)
                        }}
                        placeholder="kolom keluaran"
                      />
                      <span className="self-center text-neutral-400">←</span>
                      <Input
                        value={r.src}
                        onChange={(e) => {
                          const next = [...fieldRows]
                          next[i] = { ...next[i]!, src: e.target.value }
                          setFieldRows(next)
                        }}
                        placeholder="path sumber"
                        className="font-mono text-sm"
                      />
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  plain
                  className="mt-2 !text-sm"
                  onClick={() => setFieldRows([...fieldRows, { out: '', src: '' }])}
                >
                  <PlusIcon className="size-4" />
                  Tambah kolom
                </Button>
              </Field>
            )}
            <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Pratinjau (1 halaman)</p>
                <ButtonPrimary
                  type="button"
                  outline
                  disabled={previewMut.isPending}
                  onClick={() => previewMut.mutate()}
                  className="!text-sm"
                >
                  {previewMut.isPending ? 'Memuat…' : 'Pratinjau'}
                </ButtonPrimary>
              </div>
              {previewRows && previewRows.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-700">
                        {Object.keys(previewRows[0]!).map((k) => (
                          <th key={k} className="px-2 py-1.5 font-semibold text-neutral-600 dark:text-neutral-300">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 5).map((row, ri) => (
                        <tr key={ri} className="border-b border-neutral-100 dark:border-neutral-800">
                          {Object.values(row).map((v, ci) => (
                            <td key={ci} className="max-w-[12rem] truncate px-2 py-1.5 text-neutral-700 dark:text-neutral-300">
                              {String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              Hasil panen akan menjadi <strong>aset dataset</strong> milik Anda di platform PSD.
            </div>
            <Field>
              <Label>Mode output</Label>
              <select
                value={form.output_mode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    output_mode: e.target.value as 'new' | 'version',
                    dataset_slug: null,
                  }))
                }
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
              >
                <option value="new">Buat dataset baru</option>
                <option value="version">Tambah versi ke dataset existing</option>
              </select>
            </Field>
            {form.output_mode === 'version' && (
              <Field>
                <Label>Dataset tujuan</Label>
                <select
                  value={form.dataset_slug ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, dataset_slug: e.target.value || null }))}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                >
                  <option value="">— Pilih dataset —</option>
                  {myDatasets.map((d) => (
                    <option key={d.id} value={d.slug}>
                      {d.name} ({d.slug})
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field>
              <Label>Format berkas</Label>
              <select
                value={form.output_format}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    output_format: e.target.value as HarvestJobPayload['output_format'],
                  }))
                }
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
              >
                <option value="csv">CSV</option>
                <option value="jsonl">JSONL</option>
                <option value="parquet">Parquet</option>
              </select>
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900/50">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Ringkasan job</h3>
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500 dark:text-neutral-400">Nama</dt>
                <dd className="font-medium">{form.name}</dd>
              </div>
              <div>
                <dt className="text-neutral-500 dark:text-neutral-400">Sumber</dt>
                <dd className="truncate font-mono text-xs">{form.source_url}</dd>
              </div>
              <div>
                <dt className="text-neutral-500 dark:text-neutral-400">Paginasi</dt>
                <dd>{form.pagination}</dd>
              </div>
              <div>
                <dt className="text-neutral-500 dark:text-neutral-400">Format</dt>
                <dd>{form.output_format}</dd>
              </div>
              <div>
                <dt className="text-neutral-500 dark:text-neutral-400">Output</dt>
                <dd>
                  {form.output_mode === 'new'
                    ? 'Dataset baru'
                    : `Versi → ${form.dataset_slug}`}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500 dark:text-neutral-400">Rate limit</dt>
                <dd>{form.rate_per_min} req/menit</dd>
              </div>
            </dl>
            <Textarea
              readOnly
              rows={3}
              value={`Setelah dijalankan, job akan mengantri dan memanen data secara async. Rahasia auth tidak akan ditampilkan ulang.`}
              className="!text-xs opacity-80"
            />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
            {hint && <p className="mt-1 text-xs opacity-90">{hint}</p>}
          </div>
        )}
      </DialogBody>
      <DialogActions>
        <Button type="button" plain onClick={handleClose}>
          Batal
        </Button>
        {step > 0 && (
          <Button type="button" outline onClick={back}>
            Kembali
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <ButtonPrimary type="button" onClick={next}>
            Lanjut
          </ButtonPrimary>
        ) : (
          <ButtonPrimary
            type="button"
            disabled={submitMut.isPending}
            onClick={() => {
              if (!validateStep()) return
              submitMut.mutate()
            }}
          >
            {submitMut.isPending ? 'Menjalankan…' : 'Buat & jalankan'}
          </ButtonPrimary>
        )}
      </DialogActions>
    </Dialog>
  )
}
