'use client'

import { OfficialBadge } from '@/components/common/OfficialBadge'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { useMe } from '@/lib/api/dashboard'
import { useTrackView } from '@/lib/analytics/useTrackView'
import { deleteNotebook, getNotebook } from '@/lib/api/notebooks'
import { hubEnabled, hubNotebookUrl } from '@/lib/hub'
import { isStaff } from '@/lib/auth/roles'
import { NotebookDetail } from '@/types/api'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import {
  ArrowTopRightOnSquareIcon,
  CodeBracketSquareIcon,
  LinkIcon,
  PencilSquareIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function NotebookDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const qc = useQueryClient()
  const me = useMe()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data, isLoading, isError, error } = useQuery<NotebookDetail>({
    queryKey: ['notebook', id],
    queryFn: () => getNotebook(id),
  })

  useTrackView(!!data, 'notebook', data?.id, {
    category_slug: data?.category?.slug,
    tags: data?.tags,
  })

  const remove = useMutation({
    mutationFn: () => deleteNotebook(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notebooks'] })
      router.push('/notebooks')
    },
  })

  const canManage =
    data &&
    me.data?.user &&
    (isStaff(me.data.user) || me.data.user.username === data.owner.username)

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

            <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                <DetailPageHeader
                  title={data.title}
                  subtitle={data.description}
                  badges={
                    <>
                      {data.tags.map((tag: string) => (
                        <Badge key={tag} color="zinc">
                          {tag}
                        </Badge>
                      ))}
                    </>
                  }
                  meta={
                    <span className="inline-flex items-center gap-1.5">
                      <UserIcon className="size-4" aria-hidden />
                      {data.owner.username}
                      {data.owner.is_official && <OfficialBadge />}
                    </span>
                  }
                  actions={
                    canManage ? (
                      <>
                        <Button href={`/notebooks/${id}/edit`} outline>
                          <PencilSquareIcon className="size-4" data-slot="icon" />
                          Edit
                        </Button>
                        {!confirmDelete ? (
                          <Button color="red" onClick={() => setConfirmDelete(true)}>
                            <TrashIcon className="size-4" data-slot="icon" />
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
                      </>
                    ) : undefined
                  }
                />

                {data.source_url && (
                  <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
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
                  </div>
                )}
              </div>

              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                  <div className="bg-gradient-to-br from-violet-500 to-indigo-600 px-5 py-6 text-white">
                    <CodeBracketSquareIcon className="size-8" aria-hidden />
                    <p className="mt-3 text-sm font-medium text-white/90">Notebook PSD</p>
                    <p className="mt-1 text-lg font-semibold">Jalankan di Jupyter Notebook</p>
                  </div>
                  <div className="space-y-4 p-5">
                    {hubEnabled() ? (
                      <ButtonPrimary
                        href={hubNotebookUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full justify-center"
                      >
                        <ArrowTopRightOnSquareIcon className="size-5" data-slot="icon" />
                        Buka Jupyter Notebook
                      </ButtonPrimary>
                    ) : (
                      <>
                        <ButtonPrimary disabled className="w-full justify-center">
                          Buka Jupyter Notebook
                        </ButtonPrimary>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Jupyter Notebook belum aktif di lingkungan ini. Lihat{' '}
                          <Link href="/help/notebook-membuka" className="text-primary-600 hover:underline dark:text-primary-400">
                            panduan notebook
                          </Link>
                          .
                        </p>
                      </>
                    )}

                    {data.source_url && (
                      <Button
                        href={data.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        outline
                        className="w-full justify-center"
                      >
                        <ArrowTopRightOnSquareIcon className="size-4" data-slot="icon" />
                        Lihat berkas di Git
                      </Button>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </QueryState>
    </DetailPageShell>
  )
}
