'use client'

import { CategoryBadge } from '@/components/common/CategoryBadge'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { TeamBadge } from '@/components/common/TeamBadge'
import { AssetStatBar } from '@/components/features/engagement/AssetStatBar'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { OpenNotebookButton } from '@/components/features/notebooks/OpenNotebookButton'
import { deleteNotebook, getNotebook } from '@/lib/api/notebooks'
import { downloadNotebookFile } from '@/lib/notebooks/download'
import { useAssetCollaboration } from '@/lib/teams/useAssetCollaboration'
import { profilePath } from '@/lib/routes/profile'
import { NotebookDetail } from '@/types/api'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  ArrowTopRightOnSquareIcon,
  CodeBracketSquareIcon,
  LinkIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function NotebookDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const qc = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data, isLoading, isError, error } = useQuery<NotebookDetail>({
    queryKey: ['notebook', id],
    queryFn: () => getNotebook(id),
  })

  const { canEdit } = useAssetCollaboration(data?.team, data?.owner.username)

  const remove = useMutation({
    mutationFn: () => deleteNotebook(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notebooks'] })
      router.push('/notebooks')
    },
  })

  const pageUrl = typeof window !== 'undefined' ? window.location.href : `https://projeksainsdata.com${pathname}`

  return (
    <DetailPageShell>
      <QueryState isLoading={isLoading} isError={isError} error={error}>
        {data && (
          <>
            <Link
              href="/notebooks"
              className="inline-flex text-sm font-medium text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400"
            >
              ← Semua notebook
            </Link>

            <DetailPageHeader
              title={data.title}
              byline={
                <p className="text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">oleh </span>
                  <Link
                    href={profilePath(data.owner.username)}
                    className="font-medium text-primary-700 hover:underline dark:text-primary-300"
                  >
                    {data.owner.username}
                  </Link>
                </p>
              }
              subtitle={data.description}
              badges={
                <>
                  <Badge color="violet">Notebook</Badge>
                  {data.source_url && (
                    <Badge color="sky">
                      <span className="inline-flex items-center gap-1">
                        <ArrowTopRightOnSquareIcon className="size-3" aria-hidden />
                        Git
                      </span>
                    </Badge>
                  )}
                  {data.owner.is_official && <OfficialBadge />}
                  {data.team && <TeamBadge team={data.team} />}
                </>
              }
              meta={
                <CategoryBadge category={data.category} subcategory={data.subcategory} />
              }
              actions={
                canEdit ? (
                  <div className="flex flex-wrap gap-2">
                    <Button href={`/notebooks/${id}/edit`} outline>
                      <PencilSquareIcon className="size-4" data-slot="icon" aria-hidden />
                      Edit
                    </Button>
                    {!confirmDelete ? (
                      <Button color="red" onClick={() => setConfirmDelete(true)}>
                        <TrashIcon className="size-4" data-slot="icon" aria-hidden />
                        Hapus
                      </Button>
                    ) : (
                      <>
                        <Button color="red" onClick={() => remove.mutate()} disabled={remove.isPending}>
                          {remove.isPending ? 'Menghapus…' : 'Ya, hapus'}
                        </Button>
                        <Button plain onClick={() => setConfirmDelete(false)}>
                          Batal
                        </Button>
                      </>
                    )}
                  </div>
                ) : undefined
              }
            />

            <AssetStatBar
              kind="notebook"
              slug={data.id}
              ownerUsername={data.owner.username}
              pageUrl={pageUrl}
              onDownload={() => void downloadNotebookFile(data)}
              className="mb-4"
            />

            {data.tags.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {data.tags.map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-xs transition-colors hover:bg-primary-100 hover:text-primary-700 dark:bg-neutral-800 dark:hover:bg-primary-900/40"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
              <div className="flex flex-col lg:flex-row lg:items-stretch">
                <div className="bg-gradient-to-br from-violet-500 to-indigo-600 px-6 py-8 text-white lg:flex lg:flex-1 lg:items-center lg:gap-5">
                  <CodeBracketSquareIcon className="size-10 shrink-0" aria-hidden />
                  <div className="mt-4 lg:mt-0">
                    <p className="text-sm font-medium text-white/90">Notebook PSD</p>
                    <p className="mt-1 text-xl font-semibold">Workspace notebook</p>
                    <p className="mt-2 text-sm text-white/85">
                      {canEdit
                        ? 'Jalankan di editor terintegrasi PSD — tanpa membuka tab baru.'
                        : 'Lihat hasil kerja pemilik notebook dalam mode baca.'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-3 border-t border-neutral-200/80 p-6 dark:border-neutral-700 lg:w-72 lg:shrink-0 lg:border-t-0 lg:border-s">
                  <OpenNotebookButton
                    notebookId={id}
                    viewOnly={!canEdit}
                    className="w-full [&_a]:w-full [&_button]:w-full [&_a]:justify-center [&_button]:justify-center"
                  />
                  <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 lg:text-left">
                    Lihat{' '}
                    <Link href="/help/notebook-membuka" className="text-primary-600 hover:underline dark:text-primary-400">
                      panduan notebook
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>

            {data.source_url && (
              <div className="mt-8 rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  <LinkIcon className="size-4 text-primary-500" aria-hidden />
                  Sumber notebook
                </h2>
                <a
                  href={data.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 break-all text-sm text-primary-600 hover:underline dark:text-primary-400"
                >
                  {data.source_url}
                  <ArrowTopRightOnSquareIcon className="size-3.5 shrink-0" aria-hidden />
                </a>
                {data.colab_url && (
                  <ButtonPrimary
                    href={data.colab_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4"
                  >
                    Buka di Google Colab
                  </ButtonPrimary>
                )}
              </div>
            )}
          </>
        )}
      </QueryState>
    </DetailPageShell>
  )
}
