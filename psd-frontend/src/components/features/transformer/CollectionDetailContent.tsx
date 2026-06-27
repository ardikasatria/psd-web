'use client'

import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { CollectionItemCard } from '@/components/features/transformer/CollectionItemCard'
import { QueryState } from '@/components/features/QueryState'
import { deleteCollection, getCollection, updateCollection } from '@/lib/api/collections'
import { search } from '@/lib/api/search'
import { isStaff } from '@/lib/auth/roles'
import { useAuth } from '@/lib/auth/useAuth'
import { hitToRepo } from '@/lib/search/hits'
import type { Collection, CollectionItem, SearchResult } from '@/types/api'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  RectangleStackIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

type Props = {
  slug: string
}

export function CollectionDetailContent({ slug }: Props) {
  const router = useRouter()
  const qc = useQueryClient()
  const { user } = useAuth()
  const staff = isStaff(user)
  const [assetSearch, setAssetSearch] = useState('')

  const { data, isLoading, isError, error } = useQuery<Collection>({
    queryKey: ['collections', slug],
    queryFn: () => getCollection(slug),
  })

  const searchQ = useQuery<SearchResult>({
    queryKey: ['search', 'collection-items', assetSearch],
    queryFn: () => search(assetSearch, 'repos'),
    enabled: staff && assetSearch.trim().length >= 2,
  })

  const items = data?.items ?? []

  const updateItems = useMutation({
    mutationFn: (nextItems: { type: string; slug?: string; id?: string }[]) =>
      updateCollection(slug, { items: nextItems }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections', slug] })
      qc.invalidateQueries({ queryKey: ['transformer-hub'] })
    },
  })

  const removeCollection = useMutation({
    mutationFn: () => deleteCollection(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      router.push('/collections')
    },
  })

  const rawItems = useMemo(() => {
    return items.map((it: CollectionItem) =>
      it.type === 'notebook' ? { type: 'notebook', id: it.id } : { type: it.type, slug: it.slug },
    )
  }, [items])

  function addRepoHit(slugValue: string, kind: string) {
    const next = [...rawItems, { type: kind, slug: slugValue }]
    updateItems.mutate(next)
    setAssetSearch('')
  }

  function removeItem(index: number) {
    const next = rawItems.filter((_: { type: string; slug?: string; id?: string }, i: number) => i !== index)
    updateItems.mutate(next)
  }

  const [coverFailed, setCoverFailed] = useState(false)
  const showCover = data?.cover_url && !coverFailed

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
        <Link href="/transformer" className="hover:text-primary-600">
          Ruang Transformer
        </Link>
        <span>/</span>
        <Link href="/collections" className="hover:text-primary-600">
          Koleksi
        </Link>
        <span>/</span>
        <span className="text-neutral-800 dark:text-neutral-200">{data?.title ?? slug}</span>
      </div>

      <QueryState isLoading={isLoading} isError={isError} error={error} skeletonColumns={2}>
        {data && (
          <>
            <div className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-800">
              <div className="relative aspect-[21/9] w-full overflow-hidden bg-gradient-to-br from-violet-400 to-indigo-600">
                {showCover ? (
                  <Image
                    src={data.cover_url!}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                    onError={() => setCoverFailed(true)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RectangleStackIcon className="size-16 text-white/30" aria-hidden />
                  </div>
                )}
              </div>
              <div className="space-y-4 p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {data.is_featured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                          <SparklesIcon className="size-3.5" aria-hidden />
                          Unggulan
                        </span>
                      )}
                      <span className="text-sm text-neutral-500">{items.length} aset</span>
                    </div>
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 sm:text-3xl">{data.title}</h1>
                  </div>
                  {staff && (
                    <Button
                      type="button"
                      outline
                      disabled={removeCollection.isPending}
                      onClick={() => {
                        if (confirm('Hapus koleksi ini?')) removeCollection.mutate()
                      }}
                    >
                      <TrashIcon className="size-4" aria-hidden />
                      Hapus
                    </Button>
                  )}
                </div>
                {data.description_md && (
                  <SimpleMarkdown content={data.description_md} className="prose-sm max-w-none text-neutral-700 dark:text-neutral-300" />
                )}
              </div>
            </div>

            {staff && (
              <section className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/40 p-5 dark:border-neutral-600 dark:bg-neutral-800/60">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  <PlusIcon className="size-4" aria-hidden />
                  Tambah aset ke koleksi
                </h2>
                <div className="relative mt-3">
                  <MagnifyingGlassIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Cari model, dataset, atau proyek…"
                    className="!ps-10"
                  />
                </div>
                {(searchQ.data?.repos?.length ?? 0) > 0 && (
                  <ul className="mt-3 space-y-2">
                    {searchQ.data!.repos.slice(0, 6).map((hit: Record<string, unknown>) => {
                      const repo = hitToRepo(hit)
                      if (!repo) return null
                      return (
                        <li
                          key={repo.slug}
                          className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{repo.name}</p>
                            <p className="text-xs capitalize text-neutral-500">{repo.kind}</p>
                          </div>
                          <Button type="button" outline onClick={() => addRepoHit(repo.slug, repo.kind)}>
                            Tambah
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            )}

            <section>
              <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Aset dalam koleksi</h2>
              {items.length === 0 ? (
                <p className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/60">
                  Belum ada aset. {staff ? 'Gunakan pencarian di atas untuk menambahkan.' : 'Tim humas sedang menyiapkan kurasi.'}
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {items.map((item: CollectionItem, i: number) => (
                    <div key={item.type === 'notebook' ? item.id : item.slug} className="relative">
                      <CollectionItemCard item={item} />
                      {staff && (
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="absolute end-2 top-2 rounded-full bg-white/90 p-1.5 text-neutral-500 shadow-sm transition hover:text-red-600 dark:bg-neutral-900/90"
                          aria-label="Hapus dari koleksi"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </QueryState>
    </div>
  )
}
