'use client'

import { flipGiteaSource, getGiteaDiff, GiteaFileEntry, listGiteaFiles } from '@/lib/api/repos'
import { formatFileSize } from '@/lib/utils/format'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import {
  ArrowPathIcon,
  ChevronRightIcon,
  CodeBracketSquareIcon,
  FolderIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useMemo, useState } from 'react'

type Props = {
  repoId: string
  cloneUrl: string
  sourceOfTruth?: string
  isOwner: boolean
  onSourceChange?: () => void
}

export function RepoGiteaFilesPanel({
  repoId,
  cloneUrl,
  sourceOfTruth = 'psd',
  isOwner,
  onSourceChange,
}: Props) {
  const qc = useQueryClient()
  const [path, setPath] = useState('')
  const [diffBase, setDiffBase] = useState('main')
  const [diffHead, setDiffHead] = useState('')
  const [showDiff, setShowDiff] = useState(false)

  const filesKey = ['gitea-files', repoId, path]
  const files = useQuery({
    queryKey: filesKey,
    queryFn: () => listGiteaFiles(repoId, path),
  })

  const diff = useQuery({
    queryKey: ['gitea-diff', repoId, diffBase, diffHead],
    queryFn: () => getGiteaDiff(repoId, diffBase, diffHead),
    enabled: showDiff && Boolean(diffBase.trim()) && Boolean(diffHead.trim()),
  })

  const flip = useMutation({
    mutationFn: () => flipGiteaSource(repoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gitea-files', repoId] })
      onSourceChange?.()
    },
  })

  const breadcrumbs = useMemo(() => {
    if (!path) return [{ label: 'root', path: '' }]
    const parts = path.split('/').filter(Boolean)
    const crumbs = [{ label: 'root', path: '' }]
    let acc = ''
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part
      crumbs.push({ label: part, path: acc })
    }
    return crumbs
  }, [path])

  const gitHost = (() => {
    try {
      return new URL(cloneUrl).host
    } catch {
      return 'Git'
    }
  })()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            Repositori Git — {gitHost}
          </p>
          <p className="mt-0.5 text-sm text-emerald-900/80 dark:text-emerald-200/80">
            Sumber utama:{' '}
            <strong>{sourceOfTruth === 'gitea' ? 'Git (Gitea)' : 'PSD (dual-write)'}</strong>
          </p>
        </div>
        {isOwner && sourceOfTruth !== 'gitea' && (
          <ButtonPrimary
            type="button"
            disabled={flip.isPending}
            onClick={() => {
              if (
                window.confirm(
                  'Jadikan Git sebagai sumber utama? File legacy PSD tidak lagi di-sync otomatis ke unggahan baru.',
                )
              ) {
                flip.mutate()
              }
            }}
          >
            {flip.isPending ? 'Memproses…' : 'Git sebagai sumber utama'}
          </ButtonPrimary>
        )}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRightIcon className="size-3.5 text-neutral-400" aria-hidden />}
              <button
                type="button"
                onClick={() => setPath(crumb.path)}
                className={clsx(
                  'rounded px-1.5 py-0.5 font-mono text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  path === crumb.path ? 'font-semibold text-primary-600 dark:text-primary-400' : 'text-neutral-600',
                )}
              >
                {crumb.label}
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => files.refetch()}
            className="ms-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <ArrowPathIcon className="size-3.5" aria-hidden />
            Segarkan
          </button>
        </div>

        {files.isLoading && <p className="text-sm text-neutral-500">Memuat dari Git…</p>}
        {files.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Gagal memuat file Git. Pastikan repositori sudah terhubung.
          </p>
        )}

        {files.data && files.data.items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-600">
            Folder kosong di Git. Clone repositori dan push commit pertama Anda.
          </p>
        )}

        {files.data && files.data.items.length > 0 && (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Nama</TableHeader>
                <TableHeader>Tipe</TableHeader>
                <TableHeader>Ukuran</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.data.items.map((entry: GiteaFileEntry) => (
                <TableRow key={entry.path}>
                  <TableCell>
                    {entry.type === 'dir' ? (
                      <button
                        type="button"
                        onClick={() => setPath(entry.path)}
                        className="inline-flex items-center gap-2 font-mono text-sm text-primary-600 hover:underline dark:text-primary-400"
                      >
                        <FolderIcon className="size-4 shrink-0 text-amber-500" aria-hidden />
                        {entry.name}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-2 font-mono text-sm">
                        <DocumentIcon className="size-4 shrink-0 text-neutral-400" aria-hidden />
                        {entry.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm capitalize text-neutral-500">{entry.type}</TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {entry.size != null ? formatFileSize(entry.size) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <section className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-5 dark:border-neutral-700 dark:bg-neutral-900/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <CodeBracketSquareIcon className="size-4 text-primary-500" aria-hidden />
            Perbandingan commit
          </h3>
          <Button type="button" outline onClick={() => setShowDiff((v) => !v)}>
            {showDiff ? 'Sembunyikan' : 'Lihat diff'}
          </Button>
        </div>

        {showDiff && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-neutral-500">Base (branch/commit)</label>
                <Input
                  value={diffBase}
                  onChange={(e) => setDiffBase(e.target.value)}
                  placeholder="main"
                  className="mt-1 !rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Head (branch/commit)</label>
                <Input
                  value={diffHead}
                  onChange={(e) => setDiffHead(e.target.value)}
                  placeholder="feature/nama-branch"
                  className="mt-1 !rounded-xl"
                />
              </div>
            </div>
            <Button
              type="button"
              disabled={!diffBase.trim() || !diffHead.trim() || diff.isFetching}
              onClick={() => diff.refetch()}
            >
              {diff.isFetching ? 'Memuat…' : 'Muat diff'}
            </Button>

            {diff.data && (
              <div className="space-y-2">
                {diff.data.total_commits != null && (
                  <p className="text-xs text-neutral-500">{diff.data.total_commits} commit</p>
                )}
                {diff.data.files.length === 0 ? (
                  <p className="text-sm text-neutral-500">Tidak ada perbedaan file.</p>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>File</TableHeader>
                        <TableHeader>Status</TableHeader>
                        <TableHeader className="text-end">+ / −</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {diff.data.files.map((f) => (
                        <TableRow key={`${f.filename}-${f.status}`}>
                          <TableCell className="font-mono text-xs">{f.filename ?? '—'}</TableCell>
                          <TableCell className="text-sm capitalize">{f.status ?? '—'}</TableCell>
                          <TableCell className="text-end text-sm text-neutral-500">
                            +{f.additions ?? 0} / −{f.deletions ?? 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
