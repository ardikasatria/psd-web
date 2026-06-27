'use client'

import { CardGridSkeleton } from '@/components/features/layout'
import { EmptyState } from '@/components/common/EmptyState'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/shared/Button'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { ReactNode } from 'react'

function ThemeSkeleton() {
  return <CardGridSkeleton />
}

interface QueryViewProps<T> {
  query: {
    isLoading: boolean
    isError: boolean
    data?: T
    error: Error | null
    refetch: () => void
  }
  skeleton?: React.ReactNode
  empty: React.ReactNode
  children: (data: T) => React.ReactNode
}

export function QueryView<T>({ query, skeleton, empty, children }: QueryViewProps<T>) {
  if (query.isLoading) return <>{skeleton ?? <ThemeSkeleton />}</>

  if (query.isError) {
    const message =
      query.error instanceof ApiError
        ? query.error.message
        : 'Gagal memuat. Periksa koneksi Anda dan coba lagi.'
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-800"
        role="alert"
      >
        <ExclamationTriangleIcon className="size-10 text-primary-600" aria-hidden />
        <div>
          <p className="font-medium text-neutral-900 dark:text-neutral-100">Gagal memuat data</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
        </div>
        <Button type="button" onClick={() => query.refetch()}>
          Muat ulang
        </Button>
      </div>
    )
  }

  const d = query.data as T | undefined
  const isEmpty =
    d == null ||
    (typeof d === 'object' &&
      d !== null &&
      'items' in d &&
      Array.isArray((d as { items?: unknown[] }).items) &&
      (d as { items: unknown[] }).items.length === 0)

  if (isEmpty) return <>{empty}</>

  return <>{children(query.data as T)}</>
}
