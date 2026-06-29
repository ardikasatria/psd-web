'use client'

import { PostComposer } from '@/components/features/social/PostComposer'
import { shareAsset, trackDownload, trackAssetView, loveAsset, getAssetStats } from '@/lib/api/engagement'
import { setItemVisibility } from '@/lib/api/liked'
import { useAuth } from '@/lib/auth/useAuth'
import { formatCompactCount } from '@/lib/utils/format'
import type { AssetStats } from '@/types/api'
import { Button } from '@/shared/Button'
import { Dialog, DialogBody, DialogTitle } from '@/shared/dialog'
import {
  ArrowDownTrayIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  HeartIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

type Props = {
  kind: string
  slug: string
  ownerUsername: string
  pageUrl: string
  forumHref?: string
  onDownload?: () => void
  className?: string
}

export function AssetStatBar({ kind, slug, ownerUsername, pageUrl, forumHref, onDownload, className }: Props) {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [shareOpen, setShareOpen] = useState(false)
  const [feedOpen, setFeedOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [likedPublic, setLikedPublic] = useState(true)
  const viewed = useRef(false)

  const isOwner = user?.username === ownerUsername

  const statsQuery = useQuery({
    queryKey: ['asset-stats', kind, slug],
    queryFn: () => getAssetStats(kind, slug),
    staleTime: 30_000,
  })

  const stats = statsQuery.data

  useEffect(() => {
    if (!stats || viewed.current) return
    viewed.current = true
    void trackAssetView(kind, slug).then(() => {
      qc.invalidateQueries({ queryKey: ['asset-stats', kind, slug] })
    })
  }, [stats, kind, slug, qc])

  const loveMutation = useMutation({
    mutationFn: () => loveAsset(kind, slug),
    onMutate: () => {
      const prev = qc.getQueryData<AssetStats>(['asset-stats', kind, slug])
      if (prev) {
        qc.setQueryData(['asset-stats', kind, slug], {
          ...prev,
          liked: !prev.liked,
          love_count: prev.love_count + (prev.liked ? -1 : 1),
        })
      }
      return { prev }
    },
    onSuccess: (data) => {
      qc.setQueryData(['asset-stats', kind, slug], (old: AssetStats | undefined) =>
        old ? { ...old, liked: data.liked, love_count: data.love_count } : old,
      )
      qc.invalidateQueries({ queryKey: ['user', ownerUsername] })
      qc.invalidateQueries({ queryKey: ['liked-assets'] })
      if (data.liked) setLikedPublic(true)
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['asset-stats', kind, slug], ctx.prev)
    },
  })

  const visibilityMutation = useMutation({
    mutationFn: (is_public: boolean) => setItemVisibility(kind, slug, is_public),
    onMutate: (is_public) => {
      const prev = likedPublic
      setLikedPublic(is_public)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) setLikedPublic(ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['liked-assets'] })
      qc.invalidateQueries({ queryKey: ['liked-summary'] })
    },
  })

  const shareMutation = useMutation({
    mutationFn: (channel: 'feed' | 'forum' | 'external' | 'link') => shareAsset(kind, slug, channel),
    onSuccess: (data) => {
      qc.setQueryData(['asset-stats', kind, slug], (old: AssetStats | undefined) =>
        old ? { ...old, share_count: data.share_count, shares: data.shares as AssetStats['shares'] } : old,
      )
      qc.invalidateQueries({ queryKey: ['user', ownerUsername] })
    },
  })

  function toggleLove() {
    if (!isLoggedIn) {
      router.push(`/login?next=${window.location.pathname}`)
      return
    }
    if (isOwner) return
    loveMutation.mutate()
  }

  async function copyLink() {
    await navigator.clipboard.writeText(pageUrl)
    setCopied(true)
    shareMutation.mutate('link')
    window.setTimeout(() => setCopied(false), 2000)
  }

  async function shareExternal() {
    if (navigator.share) {
      await navigator.share({ title: slug, url: pageUrl })
      shareMutation.mutate('external')
    } else {
      await copyLink()
    }
    setShareOpen(false)
  }

  function handleDownload() {
    onDownload?.()
    void trackDownload(kind, slug).then(() => {
      qc.setQueryData(['asset-stats', kind, slug], (old: AssetStats | undefined) =>
        old ? { ...old, download_count: old.download_count + 1 } : old,
      )
      qc.invalidateQueries({ queryKey: ['user', ownerUsername] })
    })
  }

  if (statsQuery.isLoading) {
    return (
      <div className={clsx('animate-pulse rounded-2xl border border-neutral-200/80 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/60', className)}>
        <div className="h-8 w-64 rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
    )
  }

  if (!stats) return null

  return (
    <>
      <div
        className={clsx(
          'flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200/80 bg-gradient-to-r from-neutral-50 via-white to-primary-50/30 px-4 py-3 dark:border-neutral-700 dark:from-neutral-900 dark:via-neutral-800 dark:to-primary-950/20',
          className,
        )}
      >
        <button
          type="button"
          onClick={toggleLove}
          disabled={isOwner || loveMutation.isPending}
          title={isOwner ? 'Tak bisa menyukai aset sendiri' : stats.liked ? 'Batalkan suka' : 'Suka'}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold motion-safe:transition-colors',
            isOwner
              ? 'cursor-not-allowed text-neutral-400'
              : stats.liked
                ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700',
          )}
        >
          {stats.liked ? <HeartSolidIcon className="size-5" /> : <HeartIcon className="size-5" />}
          {formatCompactCount(stats.love_count)}
        </button>

        {stats.liked && isLoggedIn && !isOwner && (
          <button
            type="button"
            onClick={() => visibilityMutation.mutate(!likedPublic)}
            disabled={visibilityMutation.isPending}
            title={likedPublic ? 'Sembunyikan dari arsip publik' : 'Tampilkan di arsip publik'}
            className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            {likedPublic ? <EyeIcon className="size-4" /> : <EyeSlashIcon className="size-4" />}
            {likedPublic ? 'Publik' : 'Privat'}
          </button>
        )}

        <Button outline className="!rounded-xl" onClick={() => setShareOpen(true)}>
          <ShareIcon className="size-4" data-slot="icon" aria-hidden />
          {formatCompactCount(stats.share_count)}
        </Button>

        {onDownload && (
          <Button outline className="!rounded-xl" onClick={handleDownload}>
            <ArrowDownTrayIcon className="size-4" data-slot="icon" aria-hidden />
            {formatCompactCount(stats.download_count)}
          </Button>
        )}

        <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
          <EyeIcon className="size-5" aria-hidden />
          {formatCompactCount(stats.view_count)}
        </span>
      </div>

      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} size="sm">
        <DialogTitle>Bagikan aset</DialogTitle>
        <DialogBody className="space-y-2">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => {
              setShareOpen(false)
              setFeedOpen(true)
            }}
          >
            <ShareIcon className="size-5 text-primary-600" />
            Bagikan ke feed komunitas
          </button>
          {forumHref && (
            <Link
              href={forumHref}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => shareMutation.mutate('forum')}
            >
              <ChatBubbleLeftIcon className="size-5 text-primary-600" />
              Bagikan ke forum / diskusi
            </Link>
          )}
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => void shareExternal()}
          >
            <ShareIcon className="size-5 text-primary-600" />
            Bagikan eksternal
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => void copyLink()}
          >
            <ClipboardDocumentIcon className="size-5 text-primary-600" />
            {copied ? 'Tautan tersalin' : 'Salin tautan'}
          </button>
        </DialogBody>
      </Dialog>

      <Dialog open={feedOpen} onClose={() => setFeedOpen(false)} size="lg">
        <DialogTitle>Bagikan ke feed</DialogTitle>
        <DialogBody>
          <PostComposer
            initialAsset={{ kind, slug }}
            className="!border-0 !p-0 !shadow-none"
            onPosted={() => {
              shareMutation.mutate('feed')
              setFeedOpen(false)
            }}
          />
        </DialogBody>
      </Dialog>
    </>
  )
}
