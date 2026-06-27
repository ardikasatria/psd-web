'use client'

import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { ProfileAvatar } from '@/components/features/users/ProfileCover'
import { addComment, deletePost, getComments, likePost, unlikePost } from '@/lib/api/social'
import { useAuth } from '@/lib/auth/useAuth'
import { isStaff } from '@/lib/auth/roles'
import { profilePath } from '@/lib/routes/profile'
import type { Profile, SocialComment, SocialPost } from '@/types/api'
import { Button } from '@/shared/Button'
import Textarea from '@/shared/Textarea'
import {
  ChatBubbleLeftIcon,
  HeartIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const kindPath: Record<string, string> = {
  project: 'projects',
  dataset: 'datasets',
  model: 'models',
}

const kindLabel: Record<string, string> = {
  project: 'Proyek',
  dataset: 'Dataset',
  model: 'Model',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} mnt lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam lalu`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function assetHref(asset: { kind: string; slug: string }) {
  const [owner, name] = asset.slug.split('/')
  const base = kindPath[asset.kind] ?? 'projects'
  return `/${base}/${owner}/${name}`
}

export function PostCard({
  post,
  onDeleted,
  showComments: initialShowComments = false,
}: {
  post: SocialPost
  onDeleted?: () => void
  showComments?: boolean
}) {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [liked, setLiked] = useState(post.liked)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [commentCount, setCommentCount] = useState(post.comment_count)
  const [showComments, setShowComments] = useState(initialShowComments)
  const [commentText, setCommentText] = useState('')
  const [likeBusy, setLikeBusy] = useState(false)

  const authorProfile: Profile = {
    id: post.author.username,
    username: post.author.username,
    name: post.author.username,
    avatar_url: post.author.avatar_url,
    banner_url: null,
    accent_color: null,
    pronouns: null,
    location: null,
    bio: null,
    about_md: null,
    status_emoji: null,
    status_text: null,
    links: [],
    interests: [],
    onboarded: true,
    is_official: post.author.is_official ?? false,
    is_instructor: false,
    account_type: post.author.type === 'org' ? 'organization' : 'individual',
    role: 'member',
    email_verified: true,
    created_at: post.created_at,
  }

  const canDelete =
    isLoggedIn &&
    (user?.username === post.author.username || isStaff(user))

  const comments = useQuery({
    queryKey: ['post-comments', post.id],
    queryFn: () => getComments(post.id),
    enabled: showComments,
  })

  const commentMutation = useMutation({
    mutationFn: () => addComment(post.id, commentText.trim()),
    onSuccess: () => {
      setCommentText('')
      setCommentCount((c) => c + 1)
      qc.invalidateQueries({ queryKey: ['post-comments', post.id] })
      qc.invalidateQueries({ queryKey: ['feed-stats'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => {
      onDeleted?.()
      qc.invalidateQueries({ queryKey: ['feed'] })
      qc.invalidateQueries({ queryKey: ['feed-stats'] })
      qc.invalidateQueries({ queryKey: ['user-posts'] })
    },
  })

  async function toggleLike() {
    if (!isLoggedIn) {
      router.push(`/login?next=${window.location.pathname}`)
      return
    }
    const prevLiked = liked
    const prevCount = likeCount
    setLikeBusy(true)
    setLiked(!liked)
    setLikeCount(likeCount + (liked ? -1 : 1))
    try {
      const res = liked ? await unlikePost(post.id) : await likePost(post.id)
      setLiked(res.liked)
      setLikeCount(res.like_count)
      qc.invalidateQueries({ queryKey: ['feed-stats'] })
    } catch {
      setLiked(prevLiked)
      setLikeCount(prevCount)
    } finally {
      setLikeBusy(false)
    }
  }

  function handleComment(e: FormEvent) {
    e.preventDefault()
    if (!isLoggedIn) {
      router.push(`/login?next=${window.location.pathname}`)
      return
    }
    if (!commentText.trim()) return
    commentMutation.mutate()
  }

  return (
    <article className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/50">
      <header className="flex items-start gap-3">
        <Link href={profilePath(post.author.username)} className="shrink-0">
          <ProfileAvatar profile={authorProfile} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link
              href={profilePath(post.author.username)}
              className="font-semibold text-neutral-900 hover:underline dark:text-white"
            >
              @{post.author.username}
            </Link>
            {post.author.is_official && <OfficialBadge className="!text-[10px]" />}
            <span className="text-xs text-neutral-400">· {timeAgo(post.created_at)}</span>
          </div>
        </div>
        {canDelete && (
          <Button
            plain
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="!text-neutral-400 hover:!text-red-500"
            aria-label="Hapus postingan"
          >
            <TrashIcon className="size-4" />
          </Button>
        )}
      </header>

      {post.body_md && (
        <div className="mt-3">
          <SimpleMarkdown content={post.body_md} />
        </div>
      )}

      {post.images.length > 0 && (
        <div
          className={clsx(
            'mt-3 grid gap-2',
            post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          )}
        >
          {post.images.map((url) => (
            <div key={url} className="relative aspect-video overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
              <Image src={url} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 500px" />
            </div>
          ))}
        </div>
      )}

      {post.asset && (
        <Link
          href={assetHref(post.asset)}
          className="mt-3 flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 motion-safe:transition-colors hover:border-primary-300 hover:bg-primary-50/50 dark:border-neutral-700 dark:bg-neutral-800/50 dark:hover:border-primary-700"
        >
          <span className="rounded-lg bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
            {kindLabel[post.asset.kind] ?? post.asset.kind}
          </span>
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{post.asset.slug}</span>
        </Link>
      )}

      <div className="mt-4 flex items-center gap-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <button
          type="button"
          onClick={toggleLike}
          disabled={likeBusy}
          className={clsx(
            'inline-flex items-center gap-1.5 text-sm font-medium motion-safe:transition-colors',
            liked ? 'text-red-500' : 'text-neutral-500 hover:text-red-500'
          )}
        >
          {liked ? <HeartSolidIcon className="size-5" /> : <HeartIcon className="size-5" />}
          {likeCount}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400"
        >
          <ChatBubbleLeftIcon className="size-5" />
          {commentCount}
        </button>
      </div>

      {showComments && (
        <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          {(comments.data?.items ?? []).map((c: SocialComment) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <Link href={profilePath(c.author.username)} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                @{c.author.username}
              </Link>
              <span className="text-neutral-600 dark:text-neutral-400">{c.body_md}</span>
            </div>
          ))}
          <form onSubmit={handleComment} className="flex gap-2">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Tulis komentar..."
              rows={2}
              className="min-w-0 flex-1 !rounded-xl !text-sm"
            />
            <Button type="submit" disabled={commentMutation.isPending || !commentText.trim()}>
              Kirim
            </Button>
          </form>
        </div>
      )}
    </article>
  )
}
