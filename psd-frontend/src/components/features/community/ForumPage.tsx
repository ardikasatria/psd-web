'use client'

import { CreateThreadDialog } from '@/components/features/community/CreateThreadDialog'
import { ForumSidebar } from '@/components/features/community/ForumSidebar'
import { ThreadCard } from '@/components/features/ThreadCard'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageHero, FeaturePageShell, SearchField } from '@/components/features/layout'
import { getThreads } from '@/lib/api/community'
import { useAuth } from '@/lib/auth/useAuth'
import { PaginatedThreadSummary, ThreadSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import clsx from 'clsx'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'

function ForumPageInner() {
  const searchParams = useSearchParams()
  const initialTag = searchParams.get('tags')
  const { isLoggedIn } = useAuth()
  const [q, setQ] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(initialTag)
  const [sort, setSort] = useState<'recent' | 'top'>('recent')
  const [createOpen, setCreateOpen] = useState(false)

  const tagsParam = activeTag ?? undefined
  const { data, isLoading, isError, error } = useQuery<PaginatedThreadSummary>({
    queryKey: ['threads', q, tagsParam, sort],
    queryFn: () =>
      getThreads({ q: q || undefined, tags: tagsParam, sort: sort === 'top' ? 'top' : undefined }),
  })

  const items = useMemo(() => data?.items ?? [], [data?.items])

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          <FeaturePageHero
            title="Forum"
            subtitle="Diskusi terstruktur, tanya jawab, dan berbagi pengalaman dengan komunitas PSD."
            variant="compact"
            actions={
              isLoggedIn ? (
                <ButtonPrimary type="button" onClick={() => setCreateOpen(true)}>
                  <PlusIcon className="size-4" aria-hidden />
                  Buka topik
                </ButtonPrimary>
              ) : (
                <ButtonPrimary href="/login?next=/forum">Masuk untuk menulis</ButtonPrimary>
              )
            }
          />

          <div className="rounded-3xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:p-5">
            <SearchField
              value={q}
              onChange={setQ}
              placeholder="Cari diskusi..."
              aria-label="Cari diskusi forum"
              className="w-full max-w-none"
            />
            {activeTag && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-neutral-500">Filter:</span>
                <button
                  type="button"
                  onClick={() => setActiveTag(null)}
                  className="rounded-full bg-primary-100 px-3 py-0.5 font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                >
                  #{activeTag} ×
                </button>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              {(
                [
                  { id: 'recent' as const, label: 'Terbaru' },
                  { id: 'top' as const, label: 'Terpopuler' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSort(opt.id)}
                  className={clsx(
                    'rounded-full px-3 py-1 text-sm font-medium transition',
                    sort === opt.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!items.length}
            emptyTitle="Belum ada diskusi"
            emptyDescription={
              isLoggedIn
                ? 'Jadilah yang pertama memulai percakapan — klik Buka topik di atas.'
                : 'Masuk untuk membuka topik atau jelajahi komunitas.'
            }
            emptyAction={!isLoggedIn ? { label: 'Masuk', href: '/login?next=/forum' } : undefined}
            skeletonColumns={1}
          >
            <div className="grid gap-4">
              {items.map((t: ThreadSummary) => (
                <ThreadCard key={t.id} thread={t} />
              ))}
            </div>
            {(data?.total ?? 0) > items.length && (
              <p className="text-center text-sm text-neutral-500">
                Menampilkan {items.length} dari {data?.total} diskusi
              </p>
            )}
          </QueryState>

          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Butuh update cepat? Kunjungi juga{' '}
            <Link href="/community" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Feed komunitas
            </Link>
            .
          </p>
        </div>

        <ForumSidebar
          className="w-full shrink-0 lg:sticky lg:top-24 lg:w-80"
          activeTag={activeTag}
          onTagClick={setActiveTag}
        />
      </div>

      <CreateThreadDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </FeaturePageShell>
  )
}

export function ForumPage() {
  return (
    <Suspense>
      <ForumPageInner />
    </Suspense>
  )
}
