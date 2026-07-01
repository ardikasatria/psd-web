'use client'

import { QueryState } from '@/components/features/QueryState'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { listPipelineTrash, permanentDeletePipeline, restorePipeline } from '@/lib/api/factory'
import { listMyTrash, permanentDeleteRepo, restoreRepo } from '@/lib/api/repos'
import type { RepoKind, TrashPipelineSummary, TrashRepoSummary } from '@/types/api'
import { Button } from '@/shared/Button'
import { TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { useMemo, useState } from 'react'

const KIND_LABEL: Record<RepoKind, string> = {
  project: 'Proyek',
  dataset: 'Dataset',
  model: 'Model',
}

const KIND_PATH: Record<RepoKind, string> = {
  project: 'projects',
  dataset: 'datasets',
  model: 'models',
}

type TrashFilter = RepoKind | 'pipeline' | 'all'

function RepoTrashRow({ item }: { item: TrashRepoSummary }) {
  const qc = useQueryClient()
  const [confirmPermanent, setConfirmPermanent] = useState(false)

  const restore = useMutation({
    mutationFn: () => restoreRepo(item.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-trash'] })
      qc.invalidateQueries({ queryKey: ['my-repos'] })
      qc.invalidateQueries({ queryKey: ['repo'] })
    },
  })

  const purge = useMutation({
    mutationFn: () => permanentDeleteRepo(item.id),
    onSuccess: () => {
      setConfirmPermanent(false)
      qc.invalidateQueries({ queryKey: ['my-trash'] })
    },
  })

  const [owner, name] = item.slug.split('/')
  const href = `/${KIND_PATH[item.kind]}/${owner}/${name}`

  return (
    <li className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              {KIND_LABEL[item.kind]}
            </span>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{item.name}</p>
          </div>
          <p className="mt-1 font-mono text-xs text-neutral-500">{item.slug}</p>
          <p className="mt-2 text-xs text-neutral-500">
            Dihapus {new Date(item.deleted_at).toLocaleDateString('id-ID')} · permanen dalam{' '}
            <strong className="text-amber-700 dark:text-amber-300">{item.days_until_purge} hari</strong>
          </p>
        </div>
        <TrashActions
          restorePending={restore.isPending}
          purgePending={purge.isPending}
          confirmPermanent={confirmPermanent}
          onRestore={() => restore.mutate()}
          onPurge={() => purge.mutate()}
          onConfirmPermanent={() => setConfirmPermanent(true)}
          onCancelPermanent={() => setConfirmPermanent(false)}
        />
      </div>
      <p className="mt-3 text-xs text-neutral-400">
        Setelah dipulihkan, aset kembali tampil di{' '}
        <Link href={href} className="text-primary-600 hover:underline dark:text-primary-400">
          halaman publik
        </Link>
        .
      </p>
    </li>
  )
}

function PipelineTrashRow({ item }: { item: TrashPipelineSummary }) {
  const qc = useQueryClient()
  const [confirmPermanent, setConfirmPermanent] = useState(false)

  const restore = useMutation({
    mutationFn: () => restorePipeline(item.slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-trash'] })
      qc.invalidateQueries({ queryKey: ['factory-pipelines'] })
      qc.invalidateQueries({ queryKey: ['factory-pipeline', item.slug] })
    },
  })

  const purge = useMutation({
    mutationFn: () => permanentDeletePipeline(item.slug),
    onSuccess: () => {
      setConfirmPermanent(false)
      qc.invalidateQueries({ queryKey: ['pipeline-trash'] })
    },
  })

  return (
    <li className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              Pipeline
            </span>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{item.title}</p>
          </div>
          <p className="mt-1 font-mono text-xs text-neutral-500">{item.slug}</p>
          <p className="mt-2 text-xs text-neutral-500">
            Dihapus {new Date(item.deleted_at).toLocaleDateString('id-ID')} · permanen dalam{' '}
            <strong className="text-amber-700 dark:text-amber-300">{item.days_until_purge} hari</strong>
          </p>
        </div>
        <TrashActions
          restorePending={restore.isPending}
          purgePending={purge.isPending}
          confirmPermanent={confirmPermanent}
          onRestore={() => restore.mutate()}
          onPurge={() => purge.mutate()}
          onConfirmPermanent={() => setConfirmPermanent(true)}
          onCancelPermanent={() => setConfirmPermanent(false)}
        />
      </div>
      <p className="mt-3 text-xs text-neutral-400">
        Setelah dipulihkan, pipeline kembali tampil di{' '}
        <Link
          href={`/factory/pipelines/${item.slug}`}
          className="text-primary-600 hover:underline dark:text-primary-400"
        >
          Pabrik Data
        </Link>
        .
      </p>
    </li>
  )
}

function TrashActions({
  restorePending,
  purgePending,
  confirmPermanent,
  onRestore,
  onPurge,
  onConfirmPermanent,
  onCancelPermanent,
}: {
  restorePending: boolean
  purgePending: boolean
  confirmPermanent: boolean
  onRestore: () => void
  onPurge: () => void
  onConfirmPermanent: () => void
  onCancelPermanent: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button outline disabled={restorePending || purgePending} onClick={onRestore}>
        <ArrowPathIcon className="size-4" data-slot="icon" aria-hidden />
        {restorePending ? 'Memulihkan…' : 'Pulihkan'}
      </Button>
      {!confirmPermanent ? (
        <Button
          outline
          className="!text-red-600"
          disabled={restorePending || purgePending}
          onClick={onConfirmPermanent}
        >
          Hapus permanen
        </Button>
      ) : (
        <>
          <Button color="red" disabled={purgePending} onClick={onPurge}>
            {purgePending ? 'Menghapus…' : 'Ya, hapus permanen'}
          </Button>
          <Button plain onClick={onCancelPermanent}>
            Batal
          </Button>
        </>
      )}
    </div>
  )
}

export function AssetTrashPage() {
  useAuthGuard('/login?next=/dashboard/trash')
  const [filter, setFilter] = useState<TrashFilter>('all')

  const repoTrash = useQuery({
    queryKey: ['my-trash', filter === 'all' ? 'all-repos' : filter],
    queryFn: () =>
      listMyTrash({
        kind: filter === 'all' || filter === 'pipeline' ? undefined : filter,
        page_size: 50,
      }),
    enabled: filter !== 'pipeline',
  })

  const pipelineTrash = useQuery({
    queryKey: ['pipeline-trash'],
    queryFn: () => listPipelineTrash({ page_size: 50 }),
    enabled: filter === 'all' || filter === 'pipeline',
  })

  const merged = useMemo(() => {
    if (filter === 'pipeline') {
      return (pipelineTrash.data?.items ?? []).map((item) => ({ type: 'pipeline' as const, item, sort: item.deleted_at }))
    }
    if (filter === 'all') {
      const repos = (repoTrash.data?.items ?? []).map((item) => ({
        type: 'repo' as const,
        item,
        sort: item.deleted_at,
      }))
      const pipes = (pipelineTrash.data?.items ?? []).map((item) => ({
        type: 'pipeline' as const,
        item,
        sort: item.deleted_at,
      }))
      return [...repos, ...pipes].sort((a, b) => b.sort.localeCompare(a.sort))
    }
    return (repoTrash.data?.items ?? []).map((item) => ({ type: 'repo' as const, item, sort: item.deleted_at }))
  }, [filter, repoTrash.data?.items, pipelineTrash.data?.items])

  const isLoading =
    (filter !== 'pipeline' && repoTrash.isLoading) ||
    ((filter === 'all' || filter === 'pipeline') && pipelineTrash.isLoading)
  const isError = repoTrash.isError || pipelineTrash.isError
  const error = repoTrash.error ?? pipelineTrash.error

  const tabs: { id: TrashFilter; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'project', label: 'Proyek' },
    { id: 'dataset', label: 'Dataset' },
    { id: 'model', label: 'Model' },
    { id: 'pipeline', label: 'Pipeline' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <TrashIcon className="size-7 text-neutral-500" aria-hidden />
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Sampah</h2>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Aset dan pipeline yang Anda hapus disimpan di sini selama <strong>30 hari</strong>. Pulihkan kapan saja
          sebelum batas waktu; setelah itu sistem menghapus permanen.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={clsx(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === t.id
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!merged.length}
        emptyTitle="Sampah kosong"
        emptyDescription="Aset atau pipeline yang Anda hapus akan muncul di sini selama 30 hari."
      >
        <ul className="space-y-3">
          {merged.map((row) =>
            row.type === 'repo' ? (
              <RepoTrashRow key={`repo-${row.item.id}`} item={row.item} />
            ) : (
              <PipelineTrashRow key={`pl-${row.item.slug}`} item={row.item} />
            ),
          )}
        </ul>
      </QueryState>
    </div>
  )
}
