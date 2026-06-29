'use client'

import { PostCard } from '@/components/features/social/PostCard'
import { PostComposer } from '@/components/features/social/PostComposer'
import { QueryState } from '@/components/features/QueryState'
import { getFeed } from '@/lib/api/social'
import { useAuth } from '@/lib/auth/useAuth'
import type { PaginatedSocialPost, SocialPost } from '@/types/api'
import clsx from 'clsx'
import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

export function SocialFeed({ className }: { className?: string }) {
  const { isLoggedIn } = useAuth()
  const [scope, setScope] = useState<'following' | 'all'>(isLoggedIn ? 'following' : 'all')

  const feed = useQuery<PaginatedSocialPost>({
    queryKey: ['feed', scope],
    queryFn: () => getFeed(scope),
    enabled: isLoggedIn || scope === 'all',
  })

  const tabs = isLoggedIn ? (['following', 'all'] as const) : (['all'] as const)

  return (
    <div className={clsx('space-y-6', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex gap-1">
          {tabs.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setScope(key)}
              className={clsx(
                'border-b-2 px-4 py-2.5 text-sm font-medium motion-safe:transition-colors',
                scope === key
                  ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
              )}
            >
              {key === 'following' ? 'Mengikuti' : 'Semua'}
            </button>
          ))}
        </div>
        {!isLoggedIn && (
          <Link href="/login?next=/community" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
            Masuk untuk posting
          </Link>
        )}
      </div>

      {isLoggedIn && <PostComposer />}

      <QueryState
        isLoading={feed.isLoading}
        isError={feed.isError}
        error={feed.error}
        isEmpty={!feed.data?.items.length}
        emptyTitle={scope === 'following' ? 'Feed masih kosong' : 'Belum ada postingan'}
        emptyDescription={
          scope === 'following'
            ? 'Ikuti praktisi dari panel Tier teratas atau Populer di atas, atau jelajahi tab Semua untuk mulai.'
            : 'Jadilah yang pertama membagikan update ke komunitas.'
        }
      >
        <div className="space-y-4">
          {(feed.data?.items ?? []).map((post: SocialPost) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </QueryState>
    </div>
  )
}
