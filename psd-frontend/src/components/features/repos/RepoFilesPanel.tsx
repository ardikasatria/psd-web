'use client'

import { RepoGiteaFilesPanel } from '@/components/features/repos/RepoGiteaFilesPanel'
import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { deleteRepoFile, uploadRepoFile } from '@/lib/api/repos'
import { formatFileSize } from '@/lib/utils/format'
import type { RepoFile } from '@/types/api'
import { Button } from '@/shared/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { ArrowDownTrayIcon, CloudArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

const MAX_BYTES = 50 * 1024 * 1024

interface RepoFilesPanelProps {
  repoId: string
  files: RepoFile[]
  isOwner: boolean
  license?: string | null
  cloneUrl?: string | null
  sourceOfTruth?: string
  onChange: () => void
}

function LegacyFilesPanel({
  repoId,
  files,
  isOwner,
  license,
  onChange,
  showLegacyNote,
}: {
  repoId: string
  files: RepoFile[]
  isOwner: boolean
  license?: string | null
  onChange: () => void
  showLegacyNote?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useMutation({
    mutationFn: (file: File) => {
      if (file.size > MAX_BYTES) throw new Error('Ukuran maksimal 50 MB per file.')
      return uploadRepoFile(repoId, file)
    },
    onSuccess: () => {
      setError(null)
      onChange()
    },
    onError: (e: Error) => setError(e.message || 'Gagal mengunggah file.'),
  })

  const remove = useMutation({
    mutationFn: (path: string) => deleteRepoFile(repoId, path),
    onSuccess: onChange,
    onError: () => setError('Gagal menghapus file.'),
  })

  const handleFiles = (list: FileList | null) => {
    const file = list?.[0]
    if (file) upload.mutate(file)
  }

  return (
    <div className="space-y-4">
      {showLegacyNote && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Unggahan PSD legacy — setelah Git jadi sumber utama, kelola file via clone & push.
        </p>
      )}

      {isOwner && (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
            dragOver
              ? 'border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-950/30'
              : 'border-neutral-300 hover:border-primary-300 dark:border-neutral-600',
          )}
        >
          <CloudArrowUpIcon className="mb-2 size-8 text-neutral-400" aria-hidden />
          <p className="font-medium text-neutral-800 dark:text-neutral-200">
            {upload.isPending ? 'Mengunggah...' : 'Seret file ke sini atau klik untuk memilih'}
          </p>
          <p className="mt-1 text-sm text-neutral-500">Maksimal 50 MB per file</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {files.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-600">
          {isOwner ? 'Belum ada file legacy.' : 'Belum ada file yang dibagikan.'}
        </p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Nama file</TableHeader>
              <TableHeader>Ukuran</TableHeader>
              <TableHeader className="text-end">Aksi</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map((f) => (
              <TableRow key={f.path}>
                <TableCell className="font-mono text-sm">{f.path}</TableCell>
                <TableCell>{formatFileSize(f.size_bytes)}</TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-2">
                    {f.url && (
                      <Button href={f.url} target="_blank" rel="noopener noreferrer" outline>
                        <ArrowDownTrayIcon className="size-4" data-slot="icon" aria-hidden />
                        Unduh
                      </Button>
                    )}
                    {isOwner && (
                      <Button
                        outline
                        className="!text-red-600"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (window.confirm(`Hapus file "${f.path}"?`)) remove.mutate(f.path)
                        }}
                      >
                        <TrashIcon className="size-4" data-slot="icon" aria-hidden />
                        Hapus
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {license && <p className="text-sm text-neutral-500 dark:text-neutral-400">Lisensi: {license}</p>}
    </div>
  )
}

export function RepoFilesPanel({
  repoId,
  files,
  isOwner,
  license,
  cloneUrl,
  sourceOfTruth = 'psd',
  onChange,
}: RepoFilesPanelProps) {
  if (cloneUrl) {
    return (
      <div className="space-y-8">
        <RepoGiteaFilesPanel
          repoId={repoId}
          cloneUrl={cloneUrl}
          sourceOfTruth={sourceOfTruth}
          isOwner={isOwner}
          onSourceChange={onChange}
        />
        {sourceOfTruth !== 'gitea' && (files.length > 0 || isOwner) && (
          <LegacyFilesPanel
            repoId={repoId}
            files={files}
            isOwner={isOwner}
            license={undefined}
            onChange={onChange}
            showLegacyNote
          />
        )}
        {license && sourceOfTruth === 'gitea' && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Lisensi: {license}</p>
        )}
      </div>
    )
  }

  return (
    <LegacyFilesPanel
      repoId={repoId}
      files={files}
      isOwner={isOwner}
      license={license}
      onChange={onChange}
    />
  )
}
