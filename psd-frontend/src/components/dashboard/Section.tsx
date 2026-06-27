'use client'

import { SeeAllLink } from '@/components/features/layout'
import Skeleton from '@/components/Skeleton'
import { Button } from '@/shared/Button'
import type { UseQueryResult } from '@tanstack/react-query'
import { ReactNode } from 'react'

export function Section<T>({
  title,
  href,
  query,
  children,
  empty,
}: {
  title: string
  href?: string
  query: UseQueryResult<{ items: T[]; total: number }>
  children: (items: T[]) => ReactNode
  empty: ReactNode
}) {
  const { data, isLoading, isError, refetch } = query

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
      <header className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-700">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
        {href && (
          <SeeAllLink href={href} className="!px-3 !py-1.5 !text-sm" />
        )}
      </header>

      <div className="p-5">
        {isLoading && (
          <div className="space-y-3" aria-busy="true" aria-label="Memuat data">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Gagal memuat. Coba lagi.</p>
            <Button onClick={() => refetch()}>Muat ulang</Button>
          </div>
        )}
        {!isLoading && !isError && (data?.items.length ? children(data.items) : empty)}
      </div>
    </div>
  )
}
