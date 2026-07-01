'use client'

import { QueryState } from '@/components/features/QueryState'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { listMyTrash, permanentDeleteRepo, restoreRepo } from '@/lib/api/repos'
import type { RepoKind, TrashRepoSummary } from '@/types/api'
import { Button } from '@/shared/Button'
import { TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { useState } from 'react'

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

function TrashRow({ item }: { item: TrashRepoSummary }) {
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
        <div className="flex flex-wrap gap-2">
          <Button
            outline
            disabled={restore.isPending || purge.isPending}
            onClick={() => restore.mutate()}
          >
            <ArrowPathIcon className="size-4" data-slot="icon" aria-hidden />
            {restore.isPending ? 'Memulihkan…' : 'Pulihkan'}
          </Button>
          {!confirmPermanent ? (
            <Button
              outline
              className="!text-red-600"
              disabled={restore.isPending || purge.isPending}
              onClick={() => setConfirmPermanent(true)}
            >
              Hapus permanen
            </Button>
          ) : (
            <>
              <Button
                color="red"
                disabled={purge.isPending}
                onClick={() => purge.mutate()}
              >
                {purge.isPending ? 'Menghapus…' : 'Ya, hapus permanen'}
              </Button>
              <Button plain onClick={() => setConfirmPermanent(false)}>
                Batal
              </Button>
            </>
          )}
        </div>
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

export function AssetTrashPage() {
  useAuthGuard('/login?next=/dashboard/trash')
  const [filter, setFilter] = useState<RepoKind | 'all'>('all')

  const query = useQuery({
    queryKey: ['my-trash', filter],
    queryFn: () =>
      listMyTrash({
        kind: filter === 'all' ? undefined : filter,
        page_size: 50,
      }),
  })

  const tabs: { id: RepoKind | 'all'; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'project', label: 'Proyek' },
    { id: 'dataset', label: 'Dataset' },
    { id: 'model', label: 'Model' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <TrashIcon className="size-7 text-neutral-500" aria-hidden />
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Sampah aset</h2>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Aset yang Anda hapus disimpan di sini selama <strong>30 hari</strong> sebagai cadangan — seperti trash di
          GitHub atau Hugging Face. Pulihkan kapan saja sebelum batas waktu; setelah itu sistem menghapus permanen
          (file, metadata, indeks pencarian).
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
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        isEmpty={!query.data?.items.length}
        emptyTitle="Sampah kosong"
        emptyDescription="Aset yang Anda hapus akan muncul di sini selama 30 hari."
      >
        <ul className="space-y-3">
          {query.data?.items.map((item) => (
            <TrashRow key={item.id} item={item} />
          ))}
        </ul>
      </QueryState>
    </div>
  )
}
