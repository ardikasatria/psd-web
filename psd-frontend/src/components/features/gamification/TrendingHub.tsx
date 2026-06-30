'use client'

import { sidebarGradientBr } from '@/components/common/featureGradients'
import { RepoCard } from '@/components/features/RepoCard'
import { getCompetitionStats } from '@/lib/api/competitions'
import { getForumStats } from '@/lib/api/community'
import { getDiscover } from '@/lib/api/repos'
import { getFeedStats } from '@/lib/api/social'
import { feedPostPath } from '@/lib/routes/community'
import { getEventStats } from '@/lib/api/events'
import { getLearningPaths } from '@/lib/api/learn'
import type { CompetitionHot, EventSummary, FeedHotPost, LearningPathSummary, ThreadSummary } from '@/types/api'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BoltIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CubeIcon,
  FireIcon,
  FolderIcon,
  HeartIcon,
  NewspaperIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { useMemo, useState } from 'react'

const TABS = [
  { id: 'all', label: 'Semua', icon: FireIcon },
  { id: 'assets', label: 'Aset', icon: CubeIcon },
  { id: 'competitions', label: 'Kompetisi', icon: TrophyIcon },
  { id: 'community', label: 'Komunitas', icon: NewspaperIcon },
  { id: 'learn', label: 'Belajar', icon: AcademicCapIcon },
] as const

type TabId = (typeof TABS)[number]['id']

const STRIPE_SOFT =
  'rounded-2xl bg-neutral-100/80 px-4 py-6 sm:px-6 sm:py-8 dark:bg-neutral-800/40'
const STRIPE_THEME =
  'rounded-2xl bg-white px-4 py-6 sm:px-6 sm:py-8 dark:bg-neutral-900/55'

function TrendStripe({
  variant,
  children,
}: {
  variant: 'soft' | 'theme'
  children: React.ReactNode
}) {
  return <div className={variant === 'soft' ? STRIPE_SOFT : STRIPE_THEME}>{children}</div>
}

function SectionHeader({ title, href, icon }: { title: string; href: string; icon: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
        {icon}
        {title}
      </h3>
      <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
        Lihat semua
        <ArrowRightIcon className="size-3.5" aria-hidden />
      </Link>
    </div>
  )
}

function CompetitionTrendCard({ item }: { item: CompetitionHot }) {
  return (
    <Link
      href={`/competitions/${item.slug}`}
      className="group flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800"
    >
      <div className="flex items-start justify-between gap-2">
        <TrophyIcon className="size-5 shrink-0 text-amber-500" aria-hidden />
        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
          {item.participants} peserta
        </span>
      </div>
      <p className="mt-2 line-clamp-2 font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-neutral-100">
        {item.title}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{item.metric}</p>
    </Link>
  )
}

function ThreadTrendCard({ thread }: { thread: ThreadSummary }) {
  return (
    <Link
      href={`/forum/${thread.id}`}
      className="group block rounded-2xl border border-neutral-200/80 bg-white p-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800"
    >
      <p className="line-clamp-2 font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-neutral-100">
        {thread.title}
      </p>
      <p className="mt-2 text-xs text-neutral-500">
        {thread.replies} balasan · skor {thread.score}
      </p>
    </Link>
  )
}

function PostTrendCard({ post }: { post: FeedHotPost }) {
  return (
    <Link
      href={feedPostPath(post.id)}
      className="group block rounded-2xl border border-neutral-200/80 bg-white p-4 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800"
    >
      <p className="text-xs font-medium text-neutral-500">@{post.author.username}</p>
      <p className="mt-1 line-clamp-2 text-sm text-neutral-800 dark:text-neutral-200">{post.preview}</p>
      <p className="mt-2 flex items-center gap-1 text-xs text-neutral-500">
        <HeartIcon className="size-3.5" aria-hidden />
        {post.like_count} suka
      </p>
    </Link>
  )
}

function EventTrendCard({ event }: { event: EventSummary }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group block rounded-2xl border border-neutral-200/80 bg-white p-4 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800"
    >
      <CalendarDaysIcon className="size-5 text-violet-500" aria-hidden />
      <p className="mt-2 line-clamp-2 font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-neutral-100">
        {event.title}
      </p>
      <p className="mt-1 text-xs capitalize text-neutral-500">{event.type.replace('_', ' ')}</p>
    </Link>
  )
}

function PathTrendCard({ path }: { path: LearningPathSummary }) {
  return (
    <Link
      href={`/learn/paths/${path.slug}`}
      className={clsx(sidebarGradientBr.learn, 'group block transition hover:-translate-y-0.5 hover:shadow-md')}
    >
      <AcademicCapIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
      <p className="mt-2 line-clamp-2 font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-neutral-100">
        {path.title}
      </p>
      <p className="mt-1 line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400">{path.description}</p>
      {path.items_count != null && (
        <p className="mt-2 text-xs font-medium text-primary-700 dark:text-primary-300">{path.items_count} aset jalur</p>
      )}
    </Link>
  )
}

export function TrendingHub() {
  const [tab, setTab] = useState<TabId>('all')

  const discover = useQuery({ queryKey: ['discover'], queryFn: getDiscover, staleTime: 60_000 })
  const compStats = useQuery({ queryKey: ['competition-stats'], queryFn: getCompetitionStats, staleTime: 60_000 })
  const forumStats = useQuery({ queryKey: ['forum-stats'], queryFn: getForumStats, staleTime: 60_000 })
  const feedStats = useQuery({ queryKey: ['feed-stats'], queryFn: getFeedStats, staleTime: 60_000 })
  const eventStats = useQuery({ queryKey: ['event-stats'], queryFn: getEventStats, staleTime: 60_000 })
  const paths = useQuery({ queryKey: ['learning-paths'], queryFn: () => getLearningPaths(), staleTime: 60_000 })

  const assets = useMemo(() => {
    const featured = discover.data?.featured ?? []
    const recent = discover.data?.recent ?? []
    const seen = new Set<string>()
    return [...featured, ...recent].filter((r) => {
      const key = `${r.kind}-${r.owner.username}-${r.name}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 6)
  }, [discover.data])

  const hotComps = compStats.data?.hot_active ?? []
  const hotThreads = forumStats.data?.hot_threads ?? []
  const hotPosts = feedStats.data?.hot_posts ?? []
  const featuredEvents = eventStats.data?.featured ?? []
  const pathItems = (paths.data?.items ?? []).slice(0, 4)

  const showAssets = tab === 'all' || tab === 'assets'
  const showComps = tab === 'all' || tab === 'competitions'
  const showCommunity = tab === 'all' || tab === 'community'
  const showLearn = tab === 'all' || tab === 'learn'

  const stripes: ('soft' | 'theme')[] = []
  const stripe = () => {
    const variant = stripes.length % 2 === 0 ? 'soft' : 'theme'
    stripes.push(variant)
    return variant
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            <BoltIcon className="size-3.5" aria-hidden />
            Yang sedang ramai
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Trending di PSD</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Aset, kompetisi, komunitas, dan belajar — semua momentum terkini dalam satu tempat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                tab === id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      {showAssets && assets.length > 0 && (
        <TrendStripe variant={stripe()}>
          <SectionHeader title="Aset portofolio" href="/explore" icon={<FolderIcon className="size-5 text-primary-500" />} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {assets.map((repo) => (
              <RepoCard key={`${repo.kind}-${repo.owner.username}-${repo.name}`} repo={repo} />
            ))}
          </div>
        </TrendStripe>
      )}

      {showComps && hotComps.length > 0 && (
        <TrendStripe variant={stripe()}>
          <SectionHeader title="Kompetisi panas" href="/competitions" icon={<TrophyIcon className="size-5 text-amber-500" />} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hotComps.map((c) => (
              <CompetitionTrendCard key={c.slug} item={c} />
            ))}
          </div>
        </TrendStripe>
      )}

      {showCommunity && (hotThreads.length > 0 || hotPosts.length > 0 || featuredEvents.length > 0) && (
        <TrendStripe variant={stripe()}>
          <div className="grid gap-6 lg:grid-cols-3">
          {hotThreads.length > 0 && (
            <div>
              <SectionHeader title="Forum" href="/forum" icon={<ChatBubbleLeftRightIcon className="size-5 text-indigo-500" />} />
              <div className="space-y-3">
                {hotThreads.slice(0, 3).map((t) => (
                  <ThreadTrendCard key={t.id} thread={t} />
                ))}
              </div>
            </div>
          )}
          {hotPosts.length > 0 && (
            <div>
              <SectionHeader title="Feed" href="/community" icon={<NewspaperIcon className="size-5 text-sky-500" />} />
              <div className="space-y-3">
                {hotPosts.slice(0, 3).map((p) => (
                  <PostTrendCard key={p.id} post={p} />
                ))}
              </div>
            </div>
          )}
          {featuredEvents.length > 0 && (
            <div>
              <SectionHeader title="Event" href="/events" icon={<CalendarDaysIcon className="size-5 text-violet-500" />} />
              <div className="space-y-3">
                {featuredEvents.slice(0, 3).map((e) => (
                  <EventTrendCard key={e.slug} event={e} />
                ))}
              </div>
            </div>
          )}
          </div>
        </TrendStripe>
      )}

      {showLearn && pathItems.length > 0 && (
        <TrendStripe variant={stripe()}>
          <SectionHeader title="Jalur belajar" href="/learn/paths" icon={<AcademicCapIcon className="size-5 text-primary-600" />} />
          <div className="grid gap-3 sm:grid-cols-2">
            {pathItems.map((p) => (
              <PathTrendCard key={p.slug} path={p} />
            ))}
          </div>
        </TrendStripe>
      )}

      {showAssets && assets.length === 0 && showComps && hotComps.length === 0 && (
        <p className="rounded-2xl border border-dashed border-neutral-300 py-12 text-center text-sm text-neutral-500 dark:border-neutral-600">
          Belum ada konten trending untuk filter ini.
        </p>
      )}
    </section>
  )
}
