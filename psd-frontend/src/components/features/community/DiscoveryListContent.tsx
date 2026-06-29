'use client'

import { PersonRow } from '@/components/features/community/PersonRow'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import { DISCOVERY_KIND_META, DiscoveryKind, getDiscoveryList } from '@/lib/api/discovery'
import type { DiscoveryRef } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useState } from 'react'

const VALID_KINDS = new Set<string>(['top-tier', 'popular', 'new', 'achievements', 'similar'])

export function DiscoveryListContent({ kind }: { kind: string }) {
  if (!VALID_KINDS.has(kind)) notFound()

  const meta = DISCOVERY_KIND_META[kind as DiscoveryKind]
  const [page, setPage] = useState(1)
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const list = useQuery({
    queryKey: ['discovery', kind, page],
    queryFn: () => getDiscoveryList(kind as DiscoveryKind, page),
    staleTime: 30_000,
  })

  const items = (list.data?.items ?? []).filter((p: DiscoveryRef) => !hidden.has(p.username))

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title={meta.title}
        subtitle={meta.subtitle}
        variant="compact"
        actions={
          <ButtonPrimary href="/community" className="!bg-white/15 !text-white hover:!bg-white/25">
            Kembali ke feed
          </ButtonPrimary>
        }
      />

      <div className="mt-8 rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <QueryState
          isLoading={list.isLoading}
          isError={list.isError}
          error={list.error}
          isEmpty={items.length === 0}
          emptyTitle="Belum ada rekomendasi"
          emptyDescription="Coba kategori lain atau kembali nanti saat komunitas lebih aktif."
          emptyAction={{ label: 'Ke feed komunitas', href: '/community' }}
        >
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {items.map((person: DiscoveryRef) => (
              <PersonRow
                key={person.username}
                person={person}
                className="!rounded-none px-1 py-3"
                onFollowed={(username) => setHidden((prev) => new Set(prev).add(username))}
              />
            ))}
          </ul>

          {list.data && list.data.total > list.data.page_size && (
            <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-700">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-sm font-medium text-primary-600 disabled:opacity-40 dark:text-primary-400"
              >
                ← Sebelumnya
              </button>
              <span className="text-sm text-neutral-500">
                Halaman {page} · {list.data.total} orang
              </span>
              <button
                type="button"
                disabled={page * list.data.page_size >= list.data.total}
                onClick={() => setPage((p) => p + 1)}
                className="text-sm font-medium text-primary-600 disabled:opacity-40 dark:text-primary-400"
              >
                Berikutnya →
              </button>
            </div>
          )}
        </QueryState>
      </div>

      <p className="mt-6 text-center text-sm text-neutral-500">
        <Link href="/community" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          ← Kembali ke jejaring komunitas
        </Link>
      </p>
    </FeaturePageShell>
  )
}
