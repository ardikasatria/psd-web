'use client'

import { EmptyCTA } from '@/components/dashboard/EmptyCTA'
import { ThreadRow } from '@/components/dashboard/rows/ThreadRow'
import { QueryState } from '@/components/features/QueryState'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { getMyThreads } from '@/lib/api/me'
import { PaginatedThreadSummary, ThreadSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useQuery } from '@tanstack/react-query'

export function MyCommunityPage() {
  useAuthGuard('/dashboard/community')

  const query = useQuery<PaginatedThreadSummary>({
    queryKey: ['my-threads'],
    queryFn: () => getMyThreads({ page_size: 50 }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Diskusi saya</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Utas forum yang Anda mulai atau ikuti.
          </p>
        </div>
        <ButtonPrimary href="/forum" outline>
          Buka forum
        </ButtonPrimary>
      </div>

      <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data?.items.length ? (
          <div className="space-y-3">
            {query.data.items.map((t: ThreadSummary) => (
              <ThreadRow key={t.id} thread={t} />
            ))}
          </div>
        ) : (
          !query.isLoading &&
          !query.isError && (
            <EmptyCTA text="Belum ada diskusi. Mulai utas pertama." href="/forum" cta="Tulis di forum" />
          )
        )}
      </QueryState>
    </div>
  )
}
