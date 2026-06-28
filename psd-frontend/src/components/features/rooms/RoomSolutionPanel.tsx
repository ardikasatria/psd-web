'use client'

import { SyntheticBadge } from '@/components/common/SyntheticBadge'
import { RoomSolvingView } from '@/components/features/rooms/RoomProblemPanel'
import { getNotebooks } from '@/lib/api/notebooks'
import { getRepos } from '@/lib/api/repos'
import { hubEnabled, hubNotebookUrl } from '@/lib/hub'
import {
  finishRoom,
  getSubmission,
  getTemplate,
  setTemplate,
  submitSolution,
  uploadRoomData,
} from '@/lib/api/rooms'
import { getMyTeams } from '@/lib/api/teams'
import { IdeaRoom, RepoKind, SolutionTemplate } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { Field, Label } from '@/shared/fieldset'
import {
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  PlusIcon,
  SparklesIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'

type AssetRef = { type: string; slug: string; name?: string }

function repoPath(kind: RepoKind, slug: string) {
  const [owner, name] = slug.split('/')
  const base = kind === 'project' ? 'projects' : kind === 'dataset' ? 'datasets' : 'models'
  return `/${base}/${owner}/${name}`
}

function DatasetCard({
  slug,
  dataMode,
  label,
}: {
  slug: string
  dataMode?: string | null
  label?: string
}) {
  const parts = slug.split('/')
  const href = parts.length === 2 ? `/datasets/${parts[0]}/${parts[1]}` : '#'
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label ?? 'Dataset'}</p>
        <Link href={href} className="mt-1 text-sm font-medium text-violet-600 hover:underline dark:text-violet-400">
          {slug}
        </Link>
      </div>
      <div className="flex gap-2">
        {dataMode === 'synthetic' && <SyntheticBadge />}
        {dataMode === 'secondary' && <Badge color="sky">Sekunder</Badge>}
        {dataMode === 'collect' && <Badge color="amber">Dikumpulkan</Badge>}
      </div>
    </div>
  )
}

function TemplateSections({
  template,
  editable,
  onChange,
}: {
  template: SolutionTemplate
  editable: boolean
  onChange?: (t: SolutionTemplate) => void
}) {
  return (
    <ol className="space-y-2">
      {template.sections.map((s, i) => (
        <li
          key={s.key}
          className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
            {i + 1}
          </span>
          {editable && onChange ? (
            <Input
              value={s.title}
              onChange={(e) => {
                const sections = [...template.sections]
                sections[i] = { ...s, title: e.target.value }
                onChange({ sections })
              }}
              className="!rounded-lg flex-1"
            />
          ) : (
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{s.title}</span>
          )}
        </li>
      ))}
    </ol>
  )
}

export function RoomSolutionPanel({
  room,
  slug,
  isMaster,
  isMember,
}: {
  room: IdeaRoom
  slug: string
  isMaster: boolean
  isMember: boolean
}) {
  const qc = useQueryClient()
  const [templateDraft, setTemplateDraft] = useState<SolutionTemplate | null>(null)
  const [editTemplate, setEditTemplate] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [summaryMd, setSummaryMd] = useState('')
  const [notebookId, setNotebookId] = useState('')
  const [selectedAssets, setSelectedAssets] = useState<AssetRef[]>([])
  const [metricKey, setMetricKey] = useState('')
  const [metricVal, setMetricVal] = useState('')
  const [metrics, setMetrics] = useState<Record<string, string>>({})
  const [publishAssets, setPublishAssets] = useState(true)
  const [finishVisibility, setFinishVisibility] = useState<'public' | 'private'>('public')
  const [panelError, setPanelError] = useState<string | null>(null)
  const [finishedCelebration, setFinishedCelebration] = useState(false)

  const teamSlug = room.team_slug ?? ''

  const templateQuery = useQuery({
    queryKey: ['idea-room-template', slug],
    queryFn: () => getTemplate(slug),
    enabled: ['solving', 'submitted', 'finished'].includes(room.status),
  })

  const submissionQuery = useQuery({
    queryKey: ['idea-room-submission', slug],
    queryFn: () => getSubmission(slug),
    enabled: room.status === 'submitted' || room.status === 'finished',
    retry: false,
  })

  const teamReposQuery = useQuery({
    queryKey: ['room-team-repos', teamSlug],
    queryFn: async () => {
      const [datasets, models, projects] = await Promise.all([
        getRepos('dataset', { team: teamSlug, page_size: 50 }),
        getRepos('model', { team: teamSlug, page_size: 50 }),
        getRepos('project', { team: teamSlug, page_size: 50 }),
      ])
      return [
        ...datasets.items.map((r) => ({ type: 'dataset' as const, slug: r.slug, name: r.name })),
        ...models.items.map((r) => ({ type: 'model' as const, slug: r.slug, name: r.name })),
        ...projects.items.map((r) => ({ type: 'project' as const, slug: r.slug, name: r.name })),
      ]
    },
    enabled: !!teamSlug && isMember && room.status === 'solving',
  })

  const teamNotebooksQuery = useQuery({
    queryKey: ['room-team-notebooks', teamSlug],
    queryFn: async () => {
      const res = await getNotebooks({ team: teamSlug, page_size: 50 })
      return res.items
    },
    enabled: !!teamSlug && isMaster && room.status === 'solving',
  })

  const myTeamsQuery = useQuery({
    queryKey: ['my-teams'],
    queryFn: async () => (await getMyTeams()).items as { id: string; slug: string }[],
    enabled: isMember,
  })

  const teamId = useMemo(
    () => myTeamsQuery.data?.find((t) => t.slug === teamSlug)?.id ?? room.team_id ?? '',
    [myTeamsQuery.data, teamSlug, room.team_id],
  )

  useEffect(() => {
    if (templateQuery.data) setTemplateDraft(templateQuery.data)
  }, [templateQuery.data])

  useEffect(() => {
    if (submissionQuery.data) {
      setSummaryMd(submissionQuery.data.result_summary_md)
      setNotebookId(submissionQuery.data.notebook_id ?? '')
      setSelectedAssets(submissionQuery.data.asset_refs)
      const m: Record<string, string> = {}
      for (const [k, v] of Object.entries(submissionQuery.data.metrics ?? {})) {
        m[k] = String(v)
      }
      setMetrics(m)
    }
  }, [submissionQuery.data])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['idea-room', slug] })
    qc.invalidateQueries({ queryKey: ['idea-room-submission', slug] })
    qc.invalidateQueries({ queryKey: ['me', 'gamification'] })
  }

  const saveTemplateMut = useMutation({
    mutationFn: () => setTemplate(slug, templateDraft!),
    onSuccess: (t) => {
      setTemplateDraft(t)
      setEditTemplate(false)
      setPanelError(null)
    },
    onError: (e: Error) => setPanelError(e.message),
  })

  const uploadMut = useMutation({
    mutationFn: () => uploadRoomData(slug, uploadFile!),
    onSuccess: () => {
      setUploadFile(null)
      setPanelError(null)
      invalidate()
    },
    onError: (e: Error) => setPanelError(e.message),
  })

  const submitMut = useMutation({
    mutationFn: () =>
      submitSolution(slug, {
        notebook_id: notebookId || null,
        result_summary_md: summaryMd,
        asset_refs: selectedAssets.map(({ type, slug: s }) => ({ type, slug: s })),
        metrics,
      }),
    onSuccess: () => {
      setPanelError(null)
      invalidate()
    },
    onError: (e: Error) => setPanelError(e.message),
  })

  const finishMut = useMutation({
    mutationFn: () => finishRoom(slug, { publish_assets: publishAssets, visibility: finishVisibility }),
    onSuccess: () => {
      setPanelError(null)
      setFinishedCelebration(true)
      invalidate()
    },
    onError: (e: Error) => setPanelError(e.message),
  })

  const toggleAsset = (a: AssetRef) => {
    setSelectedAssets((prev) => {
      const exists = prev.some((x) => x.slug === a.slug)
      if (exists) return prev.filter((x) => x.slug !== a.slug)
      return [...prev, a]
    })
  }

  const addMetric = () => {
    if (!metricKey.trim()) return
    setMetrics({ ...metrics, [metricKey.trim()]: metricVal })
    setMetricKey('')
    setMetricVal('')
  }

  const createLinks = teamId
    ? [
        { href: `/datasets/new?team_id=${teamId}`, label: 'Dataset' },
        { href: `/models/new?team_id=${teamId}`, label: 'Model' },
        { href: `/projects/new?team_id=${teamId}`, label: 'Proyek' },
        { href: `/notebooks/new?team_id=${teamId}`, label: 'Notebook' },
      ]
    : []

  if (room.status === 'finished') {
    const sub = submissionQuery.data
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-green-200/80 bg-gradient-to-br from-green-50 to-emerald-50/60 p-6 dark:border-green-800/50 dark:from-green-950/30 dark:to-emerald-950/20">
          <div className="flex items-start gap-4">
            <TrophyIcon className="size-10 shrink-0 text-green-600 dark:text-green-400" aria-hidden />
            <div>
              <h2 className="text-lg font-bold text-green-900 dark:text-green-100">Ruang selesai</h2>
              <p className="mt-1 text-sm text-green-800/90 dark:text-green-200/90">
                Tim memperoleh +30 reputasi dan badge Pemecah Masalah.
                {isMaster && ' Master memperoleh badge Arsitek Ide.'}
              </p>
            </div>
          </div>
        </div>
        {sub && (
          <div className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Hasil submission</h3>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {sub.result_summary_md}
            </pre>
            {Object.keys(sub.metrics ?? {}).length > 0 && (
              <dl className="grid gap-2 sm:grid-cols-2">
                {Object.entries(sub.metrics).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
                    <dt className="text-xs text-neutral-500">{k}</dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {sub.asset_refs.length > 0 && (
              <ul className="space-y-2">
                {sub.asset_refs.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={repoPath(a.type as RepoKind, a.slug)}
                      className="text-sm text-violet-600 hover:underline dark:text-violet-400"
                    >
                      {a.type}: {a.slug}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <RoomSolvingView slug={slug} dataMode={room.data_mode} datasetRepoSlug={room.dataset_repo_slug} />
      </div>
    )
  }

  if (room.status === 'submitted') {
    return (
      <div className="space-y-6">
        {!isMaster && (
          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 px-5 py-4 dark:border-indigo-800/50 dark:bg-indigo-950/20">
            <p className="text-sm text-indigo-900 dark:text-indigo-200">Menunggu master menyelesaikan ruang.</p>
          </div>
        )}
        {submissionQuery.data && (
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Ringkasan hasil</h3>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {submissionQuery.data.result_summary_md}
            </pre>
          </div>
        )}
        {isMaster && (
          <div className="rounded-2xl border border-violet-200/80 bg-violet-50/40 p-5 dark:border-violet-800/50 dark:bg-violet-950/20">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              Selesaikan ruang
            </h3>
            <label className="mb-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={publishAssets}
                onChange={(e) => setPublishAssets(e.target.checked)}
                className="rounded border-neutral-300"
              />
              Bagikan aset ke proyek
            </label>
            {publishAssets && (
              <Field className="mb-4">
                <Label>Visibilitas aset</Label>
                <select
                  value={finishVisibility}
                  onChange={(e) => setFinishVisibility(e.target.value as 'public' | 'private')}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <option value="public">Publik</option>
                  <option value="private">Privat</option>
                </select>
              </Field>
            )}
            <ButtonPrimary type="button" disabled={finishMut.isPending} onClick={() => finishMut.mutate()}>
              <CheckCircleIcon className="size-4" aria-hidden />
              {finishMut.isPending ? 'Menyelesaikan…' : 'Selesaikan ruang'}
            </ButtonPrimary>
          </div>
        )}
        {finishedCelebration && (
          <p className="text-sm text-green-600">Ruang berhasil diselesaikan.</p>
        )}
      </div>
    )
  }

  if (room.status !== 'solving') return null

  const template = templateDraft ?? templateQuery.data

  return (
    <div className="space-y-8">
      {panelError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {panelError}
        </p>
      )}

      <RoomSolvingView slug={slug} dataMode={room.data_mode} datasetRepoSlug={room.dataset_repo_slug} />

      {hubEnabled() && isMember && (
        <div className="rounded-2xl border border-violet-200/80 bg-violet-50/40 p-5 dark:border-violet-800/50 dark:bg-violet-950/20">
          <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-200">Notebook tim</h3>
          <p className="mt-1 text-sm text-violet-800/90 dark:text-violet-300/90">
            Analisis dataset Ruang Ide di JupyterHub PSD. Akses dataset via{' '}
            <code className="text-xs">psd://owner/dataset/path</code> di notebook.
          </p>
          <ButtonPrimary
            href={hubNotebookUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4"
          >
            Buka Notebook
          </ButtonPrimary>
        </div>
      )}

      {room.dataset_repo_slug && room.data_mode !== 'collect' && (
        <DatasetCard slug={room.dataset_repo_slug} dataMode={room.data_mode} />
      )}

      {room.data_mode === 'collect' && isMember && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 dark:border-amber-800/50 dark:bg-amber-950/20">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <CloudArrowUpIcon className="size-4" aria-hidden />
            Unggah data tim
          </h3>
          {!room.dataset_repo_slug ? (
            <div className="flex flex-wrap items-end gap-3">
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="text-sm text-neutral-600"
              />
              <ButtonPrimary
                type="button"
                disabled={!uploadFile || uploadMut.isPending}
                onClick={() => uploadMut.mutate()}
              >
                {uploadMut.isPending ? 'Mengunggah…' : 'Unggah'}
              </ButtonPrimary>
            </div>
          ) : (
            <DatasetCard slug={room.dataset_repo_slug} dataMode="collect" label="Data terunggah" />
          )}
        </div>
      )}

      {template && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              <DocumentTextIcon className="size-4" aria-hidden />
              Kerangka solusi
            </h3>
            {isMaster && !editTemplate && (
              <button
                type="button"
                onClick={() => setEditTemplate(true)}
                className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
              >
                Sunting template
              </button>
            )}
          </div>
          <TemplateSections
            template={template}
            editable={isMaster && editTemplate}
            onChange={isMaster ? setTemplateDraft : undefined}
          />
          {isMaster && editTemplate && templateDraft && (
            <div className="flex gap-2">
              <ButtonPrimary type="button" disabled={saveTemplateMut.isPending} onClick={() => saveTemplateMut.mutate()}>
                Simpan template
              </ButtonPrimary>
              <ButtonPrimary type="button" outline onClick={() => setEditTemplate(false)}>
                Batal
              </ButtonPrimary>
            </div>
          )}
        </section>
      )}

      {isMember && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
            Aset tim
          </h3>
          {createLinks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {createLinks.map((l) => (
                <ButtonPrimary key={l.href} href={l.href} outline className="!text-xs">
                  <PlusIcon className="size-3.5" aria-hidden />
                  {l.label}
                </ButtonPrimary>
              ))}
            </div>
          )}
          <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200/80 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-800">
            {(teamReposQuery.data ?? []).length === 0 && (
              <li className="px-4 py-3 text-sm text-neutral-500">Belum ada aset tim.</li>
            )}
            {(teamReposQuery.data ?? []).map((a) => (
              <li key={a.slug} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <Link href={repoPath(a.type as RepoKind, a.slug)} className="text-sm font-medium hover:text-violet-600">
                  <span className="text-neutral-500">{a.type}</span> {a.name ?? a.slug}
                </Link>
                {isMaster && room.status === 'solving' && (
                  <input
                    type="checkbox"
                    checked={selectedAssets.some((x) => x.slug === a.slug)}
                    onChange={() => toggleAsset(a)}
                    aria-label={`Pilih ${a.slug}`}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isMaster && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            submitMut.mutate()
          }}
          className="space-y-4 rounded-2xl border border-violet-200/80 bg-violet-50/30 p-5 dark:border-violet-800/50 dark:bg-violet-950/20"
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
            <SparklesIcon className="size-4" aria-hidden />
            Submit solusi
          </h3>
          <Field>
            <Label>Notebook tim</Label>
            <select
              value={notebookId}
              onChange={(e) => setNotebookId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">— Opsional —</option>
              {(teamNotebooksQuery.data ?? []).map((nb) => (
                <option key={nb.id} value={nb.id}>
                  {nb.title}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <Label>Ringkasan hasil (markdown)</Label>
            <Textarea
              value={summaryMd}
              onChange={(e) => setSummaryMd(e.target.value)}
              rows={6}
              className="!rounded-xl"
              placeholder="Jelaskan pendekatan, temuan utama, dan evaluasi metrik…"
            />
          </Field>
          <div>
            <Label>Metrik hasil</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(metrics).map(([k, v]) => (
                <Badge key={k} color="zinc">
                  {k}: {v}
                  <button type="button" className="ms-1" onClick={() => {
                    const next = { ...metrics }
                    delete next[k]
                    setMetrics(next)
                  }}>
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Input
                placeholder="Nama metrik"
                value={metricKey}
                onChange={(e) => setMetricKey(e.target.value)}
                className="!rounded-lg w-36"
              />
              <Input
                placeholder="Nilai"
                value={metricVal}
                onChange={(e) => setMetricVal(e.target.value)}
                className="!rounded-lg w-28"
              />
              <ButtonPrimary type="button" outline onClick={addMetric}>
                Tambah
              </ButtonPrimary>
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            Centang aset tim di atas untuk disertakan dalam submission ({selectedAssets.length} dipilih).
          </p>
          <ButtonPrimary type="submit" disabled={submitMut.isPending || !summaryMd.trim()}>
            {submitMut.isPending ? 'Mengirim…' : 'Kirim solusi'}
          </ButtonPrimary>
        </form>
      )}
    </div>
  )
}

export function RoomSubmittedMemberBanner() {
  return (
    <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 px-5 py-4 dark:border-indigo-800/50 dark:bg-indigo-950/20">
      <p className="text-sm text-indigo-900 dark:text-indigo-200">Menunggu master menyelesaikan ruang.</p>
    </div>
  )
}
