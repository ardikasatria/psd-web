'use client'

import { CardGridSkeleton } from '@/components/features/layout'
import { EmptyState } from '@/components/common/EmptyState'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/shared/Button'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { ReactNode } from 'react'

interface QueryStateProps {
  isLoading: boolean
  isError: boolean
  error: Error | null
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; href: string }
  children: ReactNode
  skeleton?: ReactNode
  skeletonColumns?: 2 | 3 | 4
  refetch?: () => void
}

export function QueryState({
  isLoading,
  isError,
  error,
  isEmpty,
  emptyTitle = 'Belum ada data',
  emptyDescription = 'Coba ubah filter atau kembali lagi nanti.',
  emptyAction,
  children,
  skeleton,
  skeletonColumns = 3,
  refetch,
}: QueryStateProps) {
  if (isLoading) {
    return skeleton ?? <CardGridSkeleton columns={skeletonColumns} />
  }

  if (isError) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'Terjadi kesalahan saat memuat data. Periksa koneksi Anda dan coba lagi.'
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
        {refetch && (
          <Button type="button" onClick={() => refetch()}>
            Muat ulang
          </Button>
        )}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        cta={emptyAction?.label}
        href={emptyAction?.href}
      />
    )
  }

  return <>{children}</>
}
