'use client'

import { NotebookCard } from '@/components/features/NotebookCard'
import { QueryState } from '@/components/features/QueryState'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { getMyNotebooks } from '@/lib/api/me'
import { OpenNotebookButton } from '@/components/features/notebooks/OpenNotebookButton'
import { PaginatedNotebookSummary, NotebookSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

export function MyNotebooksPage() {
  useAuthGuard('/dashboard/notebooks')

  const query = useQuery<PaginatedNotebookSummary>({
    queryKey: ['my-notebooks'],
    queryFn: () => getMyNotebooks({ page_size: 50 }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Notebook saya</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Notebook yang Anda daftarkan ke katalog — buat di JupyterHub, simpan ke Git, kelola metadata di sini.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonPrimary href="/notebooks/new">Bagikan notebook</ButtonPrimary>
          <OpenNotebookButton outline />
          <ButtonPrimary href="/notebooks" outline>
            Jelajahi katalog
          </ButtonPrimary>
        </div>
      </div>

      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        isEmpty={!query.data?.items.length}
        emptyTitle="Belum ada notebook"
        emptyDescription="Bagikan notebook referensi pertama Anda."
        skeletonColumns={2}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {(query.data?.items ?? []).map((nb: NotebookSummary) => (
            <div key={nb.id} className="relative">
              <NotebookCard notebook={nb} />
              <Link
                href={`/notebooks/${nb.id}/edit`}
                className="absolute end-3 top-3 rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-primary-600 shadow-sm hover:bg-white dark:bg-neutral-800/90"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      </QueryState>
    </div>
  )
}
