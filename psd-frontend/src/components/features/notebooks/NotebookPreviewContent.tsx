'use client'

import { ThemeToggle } from '@/components/common/ThemeToggle'
import { QueryState } from '@/components/features/QueryState'
import { NotebookViewer } from '@/components/features/notebooks/editor/NotebookViewer'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { getNotebook, getNotebookContent } from '@/lib/api/notebooks'
import { profilePath } from '@/lib/routes/profile'
import type { IpyNb } from '@/lib/notebooks/ipynb'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

export function NotebookPreviewContent({ id }: { id: string }) {
  useAuthGuard(`/login?next=/notebooks/${id}/preview`)

  const meta = useQuery({
    queryKey: ['notebook', id],
    queryFn: () => getNotebook(id),
  })

  const content = useQuery({
    queryKey: ['notebook', id, 'content'],
    queryFn: () => getNotebookContent(id),
    enabled: !!meta.data,
  })

  return (
    <QueryState
      isLoading={meta.isLoading || content.isLoading}
      isError={meta.isError || content.isError}
      error={meta.error ?? content.error}
    >
      {meta.data && content.data && (
        <div className="min-h-full bg-white dark:bg-[#202124]">
          <div className="border-b border-neutral-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
              <Link
                href={`/notebooks/${id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-violet-700 dark:text-neutral-400 dark:hover:text-violet-300"
              >
                <ArrowLeftIcon className="size-4" aria-hidden />
                Detail notebook
              </Link>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  Preview
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  oleh{' '}
                  <Link
                    href={profilePath(meta.data.owner.username)}
                    className="font-medium text-violet-700 hover:underline dark:text-violet-300"
                  >
                    {meta.data.owner.username}
                  </Link>
                </span>
                <ThemeToggle className="!p-1.5" />
              </div>
            </div>
          </div>

          <NotebookViewer title={meta.data.title} initialIpynb={content.data.content as IpyNb} />
        </div>
      )}
    </QueryState>
  )
}
