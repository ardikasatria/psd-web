import Skeleton from '@/components/Skeleton'
import clsx from 'clsx'

interface CardGridSkeletonProps {
  count?: number
  columns?: 2 | 3 | 4
  className?: string
}

export function CardGridSkeleton({ count = 6, columns = 3, className }: CardGridSkeletonProps) {
  const gridClass = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[columns]

  return (
    <div className={clsx('grid gap-5', gridClass, className)} aria-busy="true" aria-label="Memuat data">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-700"
        >
          <Skeleton className="h-2 w-full rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-6 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-2/3 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
