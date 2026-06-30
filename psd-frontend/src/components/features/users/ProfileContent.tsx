'use client'

import { Suspense, useState } from 'react'
import clsx from 'clsx'
import { QueryState } from '@/components/features/QueryState'
import { NotebookCard } from '@/components/features/NotebookCard'
import { ThreadCard } from '@/components/features/ThreadCard'
import { CardGridSkeleton, DetailPageShell } from '@/components/features/layout'
import { ProfileEngagementStats } from '@/components/features/engagement/ProfileEngagementStats'
import { ProfileUserSearch } from '@/components/features/users/ProfileUserSearch'
import { ProfileCard } from '@/components/features/users/ProfileCard'
import { ProfileCover } from '@/components/features/users/ProfileCover'
import { ProfileLikedTab } from '@/components/features/users/ProfileLikedTab'
import { ProfileRepoRow } from '@/components/features/users/ProfileRepoRow'
import { getMe } from '@/lib/api/auth'
import { getThreads } from '@/lib/api/community'
import { getNotebooks } from '@/lib/api/notebooks'
import { PostCard } from '@/components/features/social/PostCard'
import { getUserPosts } from '@/lib/api/social'
import { getProfile, getUserPortfolio } from '@/lib/api/users'
import { ApiError } from '@/lib/api/client'
import {
  PaginatedNotebookSummary,
  PaginatedRepoSummary,
  PaginatedThreadSummary,
  NotebookSummary,
  PaginatedSocialPost,
  SocialPost,
  RepoKind,
  RepoSummary,
  ThreadSummary,
  UserProfile,
} from '@/types/api'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { LockClosedIcon } from '@heroicons/react/24/outline'

type Tab = 'all' | RepoKind | 'notebooks' | 'discussions' | 'posts' | 'liked'

const TAB_LABELS: Record<Tab, string> = {
  all: 'Semua aset',
  project: 'Proyek',
  dataset: 'Dataset',
  model: 'Model',
  notebooks: 'Notebook',
  discussions: 'Diskusi',
  posts: 'Postingan',
  liked: 'Disukai',
}

function ProfileContentInner({ username }: { username: string }) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab: Tab =
    tabParam === 'posts' ||
    tabParam === 'liked' ||
    tabParam === 'all' ||
    tabParam === 'project' ||
    tabParam === 'dataset' ||
    tabParam === 'model' ||
    tabParam === 'notebooks' ||
    tabParam === 'discussions'
      ? tabParam
      : 'all'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [searching, setSearching] = useState(false)

  const profile = useQuery<UserProfile>({
    queryKey: ['user', username],
    queryFn: () => getProfile(username),
  })
  const me = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  })

  const isRepoTab = tab === 'all' || tab === 'project' || tab === 'dataset' || tab === 'model'
  const portfolioKind = tab === 'all' ? undefined : tab

  const portfolio = useQuery<PaginatedRepoSummary>({
    queryKey: ['portfolio', username, portfolioKind ?? 'all'],
    queryFn: () => getUserPortfolio(username, portfolioKind ? { kind: portfolioKind } : {}),
    enabled: !!profile.data && isRepoTab,
  })

  const notebooks = useQuery<PaginatedNotebookSummary>({
    queryKey: ['user-notebooks', username],
    queryFn: () => getNotebooks({ page_size: 50 }),
    enabled: !!profile.data && tab === 'notebooks',
    select: (data) => ({
      ...data,
      items: data.items.filter((nb) => nb.owner.username === username),
    }),
  })

  const discussions = useQuery<PaginatedThreadSummary>({
    queryKey: ['user-discussions', username],
    queryFn: () => getThreads({ page_size: 50 }),
    enabled: !!profile.data && tab === 'discussions',
    select: (data) => ({
      ...data,
      items: data.items.filter((t) => t.author.username === username),
    }),
  })

  const userPosts = useQuery<PaginatedSocialPost>({
    queryKey: ['user-posts', username],
    queryFn: () => getUserPosts(username),
    enabled: !!profile.data && tab === 'posts',
  })

  const isOwner = me.data?.user.username === username
  const stats = profile.data?.stats
  const accent = profile.data?.accent_color ?? '#4572b7'

  const tabs: Tab[] = ['posts', 'liked', 'all', 'project', 'dataset', 'model', 'notebooks', 'discussions']

  function tabCount(key: Tab): number | undefined {
    if (!stats) return undefined
    if (key === 'project') return stats.projects
    if (key === 'dataset') return stats.datasets
    if (key === 'model') return stats.models
    if (key === 'all') return stats.projects + stats.datasets + stats.models
    return undefined
  }

  const isPrivateProfile =
    profile.isError &&
    profile.error instanceof ApiError &&
    profile.error.code === 'private_profile'

  if (isPrivateProfile) {
    return (
      <DetailPageShell>
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-neutral-200/80 bg-white p-12 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-400 text-white shadow-md">
            <LockClosedIcon className="size-8" aria-hidden />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Profil privat</h2>
            <p className="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
              Pemilik akun membatasi visibilitas profil ini. Hanya mereka yang dapat melihat halaman ini.
            </p>
          </div>
        </div>
      </DetailPageShell>
    )
  }

  return (
    <DetailPageShell>
      <QueryState isLoading={profile.isLoading} isError={profile.isError} error={profile.error}>
        {profile.data && (
          <div
            className="profile"
            style={{ ['--psd-accent' as string]: accent }}
          >
            {/* Desktop: cover penuh + avatar & username/bio di overlay */}
            <div className="pointer-events-none relative z-0 mb-0 hidden lg:block">
              <ProfileCover profile={profile.data} className="pointer-events-none h-40 rounded-2xl" />
              <div className="absolute inset-0 z-10 grid pointer-events-none grid-cols-[minmax(0,280px)_1fr] gap-8">
                <div />
                <div className="flex items-end pb-5">
                  <div className="pointer-events-auto min-w-0 pe-2">
                    <p className="font-mono text-sm font-bold text-white drop-shadow-sm">
                      @{profile.data.username}
                    </p>
                    {profile.data.bio ? (
                      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/90 drop-shadow-sm">
                        {profile.data.bio}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-white/70 drop-shadow-sm">Belum ada bio singkat.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-20 lg:-mt-12 lg:grid lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start lg:gap-8">
              <ProfileCard
                profile={profile.data}
                isOwner={isOwner}
                isFollowing={profile.data.is_following}
                variant="sidebar"
              />

              <div className="mt-8 min-w-0 lg:mt-0 lg:pt-14">
                {profile.data.engagement && (
                  <ProfileEngagementStats engagement={profile.data.engagement} className="mb-6" />
                )}

                <ProfileUserSearch username={username} onSearchingChange={setSearching} />

                <nav
                  className={clsx(
                    '-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-700',
                    searching && 'opacity-50 pointer-events-none',
                  )}
                  role="tablist"
                  aria-label="Aset profil"
                >
                  {tabs.map((key) => {
                    const count = tabCount(key)
                    const active = tab === key
                    return (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setTab(key)}
                        className={clsx(
                          'shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium motion-safe:transition-colors',
                          active
                            ? 'text-neutral-900 dark:text-white'
                            : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                        )}
                        style={active ? { borderColor: 'var(--psd-accent)', color: 'var(--psd-accent)' } : undefined}
                      >
                        {TAB_LABELS[key]}
                        {count !== undefined && (
                          <span
                            className={clsx(
                              'ml-1.5 rounded-full px-1.5 py-0.5 text-xs',
                              active
                                ? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                            )}
                            style={
                              active
                                ? {
                                    background: `color-mix(in srgb, var(--psd-accent) 15%, transparent)`,
                                    color: 'var(--psd-accent)',
                                  }
                                : undefined
                            }
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </nav>

                {!searching && isRepoTab && (
                  <QueryState
                    isLoading={portfolio.isLoading}
                    isError={portfolio.isError}
                    error={portfolio.error}
                    isEmpty={!portfolio.data?.items.length}
                    emptyTitle="Belum ada aset"
                    emptyDescription={
                      isOwner
                        ? 'Unggah proyek, dataset, atau model pertama Anda dari dasbor.'
                        : 'Pengguna ini belum membagikan aset publik.'
                    }
                  >
                    <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200/80 bg-white dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900/50">
                      {(portfolio.data?.items ?? []).map((repo: RepoSummary) => (
                        <ProfileRepoRow key={repo.id} repo={repo} />
                      ))}
                    </div>
                  </QueryState>
                )}

                {!searching && tab === 'notebooks' && (
                  <QueryState
                    isLoading={notebooks.isLoading}
                    isError={notebooks.isError}
                    error={notebooks.error}
                    isEmpty={!notebooks.data?.items.length}
                    emptyTitle="Belum ada notebook"
                    emptyDescription="Jupyter Notebook yang dibagikan ke katalog akan muncul di sini."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(notebooks.data?.items ?? []).map((nb: NotebookSummary) => (
                        <NotebookCard key={nb.id} notebook={nb} />
                      ))}
                    </div>
                  </QueryState>
                )}

                {!searching && tab === 'posts' && (
                  <QueryState
                    isLoading={userPosts.isLoading}
                    isError={userPosts.isError}
                    error={userPosts.error}
                    isEmpty={!userPosts.data?.items.length}
                    emptyTitle="Belum ada postingan"
                    emptyDescription={
                      isOwner
                        ? 'Bagikan update pertama Anda di feed komunitas.'
                        : 'Pengguna ini belum memposting apa pun.'
                    }
                  >
                    <div className="space-y-4">
                      {(userPosts.data?.items ?? []).map((post: SocialPost) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  </QueryState>
                )}

                {!searching && tab === 'discussions' && (
                  <QueryState
                    isLoading={discussions.isLoading}
                    isError={discussions.isError}
                    error={discussions.error}
                    isEmpty={!discussions.data?.items.length}
                    emptyTitle="Belum ada diskusi"
                    emptyDescription="Thread forum dari pengguna ini akan muncul di sini."
                  >
                    <div className="grid gap-4">
                      {(discussions.data?.items ?? []).map((thread: ThreadSummary) => (
                        <ThreadCard key={thread.id} thread={thread} />
                      ))}
                    </div>
                  </QueryState>
                )}

                {!searching && tab === 'liked' && <ProfileLikedTab username={username} isOwner={isOwner} />}
              </div>
            </div>
          </div>
        )}
      </QueryState>
    </DetailPageShell>
  )
}

export function ProfileContent({ username }: { username: string }) {
  return (
    <Suspense
      fallback={
        <DetailPageShell>
          <CardGridSkeleton columns={2} />
        </DetailPageShell>
      }
    >
      <ProfileContentInner username={username} />
    </Suspense>
  )
}
