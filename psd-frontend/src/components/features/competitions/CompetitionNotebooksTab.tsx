'use client'

import { QueryState } from '@/components/features/QueryState'
import {
  createCompNotebook,
  favoriteCompNotebook,
  getCompNotebooks,
} from '@/lib/api/competitions'
import { useAuth } from '@/lib/auth/useAuth'
import type { CompNotebook } from '@/types/api'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

export function CompetitionNotebooksTab({ slug, isOpen }: { slug: string; isOpen: boolean }) {
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()

  const notebooks = useQuery({
    queryKey: ['comp-notebooks', slug],
    queryFn: () => getCompNotebooks(slug),
  })

  const create = useMutation({
    mutationFn: () => createCompNotebook(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comp-notebooks', slug] }),
  })

  const toggleFav = useMutation({
    mutationFn: (id: string) => favoriteCompNotebook(slug, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['comp-notebooks', slug] })
      const prev = qc.getQueryData<{ items: CompNotebook[] }>(['comp-notebooks', slug])
      if (prev) {
        qc.setQueryData(['comp-notebooks', slug], {
          ...prev,
          items: [...prev.items]
            .map((n) =>
              n.id === id
                ? {
                    ...n,
                    favorited: !n.favorited,
                    favorite_count: n.favorite_count + (n.favorited ? -1 : 1),
                  }
                : n
            )
            .sort((a, b) => b.favorite_count - a.favorite_count || b.updated_at.localeCompare(a.updated_at)),
        })
      }
      return { prev }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['comp-notebooks', slug], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['comp-notebooks', slug] }),
  })

  return (
    <div className="space-y-6">
      {isLoggedIn && isOpen && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Notebook kompetisi diurutkan berdasarkan favorit terbanyak.
          </p>
          <ButtonPrimary disabled={create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Membuat...' : 'Buat notebook'}
          </ButtonPrimary>
        </div>
      )}

      <QueryState
        isLoading={notebooks.isLoading}
        isError={notebooks.isError}
        error={notebooks.error}
        isEmpty={!notebooks.data?.items.length}
        emptyTitle="Belum ada notebook"
        emptyDescription="Jadilah yang pertama membuat notebook kompetisi."
      >
        <ul className="space-y-3">
          {(notebooks.data?.items ?? []).map((nb) => (
            <li
              key={nb.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-white px-4 py-3 dark:border-neutral-700/80 dark:bg-neutral-800/40"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={nb.notebook_id ? `/notebooks/${nb.notebook_id}/edit` : '#'}
                  className="font-medium text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-400"
                >
                  {nb.title}
                </Link>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">oleh {nb.owner.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => isLoggedIn && toggleFav.mutate(nb.id)}
                  disabled={!isLoggedIn || toggleFav.isPending}
                  className={clsx(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors',
                    nb.favorited
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300'
                  )}
                  aria-label={nb.favorited ? 'Hapus favorit' : 'Favoritkan'}
                >
                  {nb.favorited ? (
                    <HeartSolid className="size-4" aria-hidden />
                  ) : (
                    <HeartIcon className="size-4" aria-hidden />
                  )}
                  {nb.favorite_count}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </QueryState>
    </div>
  )
}
