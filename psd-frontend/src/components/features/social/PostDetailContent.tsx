'use client'

import { CommunitySidebar } from '@/components/features/community/CommunitySidebar'
import { PostCard } from '@/components/features/social/PostCard'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { getPost } from '@/lib/api/social'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function PostDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const postQuery = useQuery({
    queryKey: ['post', id],
    queryFn: () => getPost(id),
    retry: false,
  })

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-4">
          <Link
            href="/community"
            className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400"
          >
            <ChevronLeftIcon className="size-4" aria-hidden />
            Kembali ke feed
          </Link>

          <QueryState
            isLoading={postQuery.isLoading}
            isError={postQuery.isError}
            error={postQuery.error}
            isEmpty={!postQuery.data}
            emptyTitle="Postingan tidak ditemukan"
            emptyDescription="Postingan mungkin dihapus atau tidak dapat diakses."
            emptyAction={{ label: 'Ke feed komunitas', href: '/community' }}
          >
            {postQuery.data && (
              <PostCard
                post={postQuery.data}
                detail
                onDeleted={() => router.push('/community')}
              />
            )}
          </QueryState>
        </div>

        <div className="w-full shrink-0 lg:sticky lg:top-24 lg:w-80">
          <CommunitySidebar className="w-full" />
        </div>
      </div>
    </FeaturePageShell>
  )
}
