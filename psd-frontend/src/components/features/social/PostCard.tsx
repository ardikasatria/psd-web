'use client'

import { ContentOwnerMenu } from '@/components/common/ContentOwnerMenu'
import { ContentReportMenu } from '@/components/common/ContentReportMenu'
import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { ProfileAvatar } from '@/components/features/users/ProfileCover'
import { FeedCommentThread } from '@/components/features/social/FeedCommentThread'
import { addComment, deletePost, getComments, likePost, unlikePost, updatePost } from '@/lib/api/social'
import { useAuth } from '@/lib/auth/useAuth'
import { profilePath } from '@/lib/routes/profile'
import type { Profile, SocialPost } from '@/types/api'
import { Button } from '@/shared/Button'
import Textarea from '@/shared/Textarea'
import {
  ChatBubbleLeftIcon,
  EyeSlashIcon,
  HeartIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
  const [visibility, setVisibility] = useState(post.visibility ?? 'public')
  const [bodyMd, setBodyMd] = useState(post.body_md)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(post.body_md)
  const [showComments, setShowComments] = useState(initialShowComments)
  const [likeBusy, setLikeBusy] = useState(false)

  const authorProfile: Profile = {
    id: post.author.username,
    username: post.author.username,
    name: post.author.name ?? post.author.username,
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

  const isOwner = isLoggedIn && user?.username === post.author.username

  const comments = useQuery({
    queryKey: ['post-comments', post.id],
    queryFn: () => getComments(post.id),
    enabled: showComments,
  })

  const commentMutation = useMutation({
    mutationFn: (body_md: string) => addComment(post.id, body_md),
    onSuccess: () => {
      setCommentCount((c) => c + 1)
      qc.invalidateQueries({ queryKey: ['post-comments', post.id] })
      qc.invalidateQueries({ queryKey: ['feed-stats'] })
    },
  })

  const replyMutation = useMutation({
    mutationFn: ({ parentId, body }: { parentId: string; body: string }) =>
      addComment(post.id, body, parentId),
    onSuccess: () => {
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

  const updateMutation = useMutation({
    mutationFn: (patch: { body_md?: string; visibility?: 'public' | 'private' }) =>
      updatePost(post.id, patch),
    onSuccess: (updated) => {
      setBodyMd(updated.body_md)
      setVisibility(updated.visibility ?? 'public')
      setIsEditing(false)
      qc.invalidateQueries({ queryKey: ['feed'] })
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

  function saveEdit() {
    const text = editText.trim()
    if (!text) return
    updateMutation.mutate({ body_md: text })
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
              className="text-sm font-semibold text-neutral-900 hover:underline dark:text-white"
            >
              @{post.author.username}
            </Link>
            {post.author.is_official && <OfficialBadge className="!text-[10px]" />}
            {visibility === 'private' && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <EyeSlashIcon className="size-3" />
                Hanya saya
              </span>
            )}
            <span className="text-xs text-neutral-400">· {timeAgo(post.created_at)}</span>
          </div>
          {post.author.name && (
            <p className="mt-0.5 text-sm leading-snug text-neutral-600 dark:text-neutral-400">
              {post.author.name}
            </p>
          )}
        </div>
        {isOwner && !isEditing && (
          <ContentOwnerMenu
            visibility={visibility}
            onEdit={() => {
              setEditText(bodyMd)
              setIsEditing(true)
            }}
            onDelete={() => deleteMutation.mutate()}
            onVisibilityChange={(v) => updateMutation.mutate({ visibility: v })}
            deletePending={deleteMutation.isPending}
            visibilityPending={updateMutation.isPending}
          />
        )}
        {isLoggedIn && !isOwner && (
          <ContentReportMenu kind="post" targetId={post.id} />
        )}
      </header>

      {isEditing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            className="!rounded-xl !text-sm"
          />
          <div className="flex gap-2">
            <Button
              onClick={saveEdit}
              disabled={updateMutation.isPending || !editText.trim()}
            >
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
            <Button plain onClick={() => setIsEditing(false)} disabled={updateMutation.isPending}>
              Batal
            </Button>
          </div>
        </div>
      ) : (
        bodyMd && (
          <div className="mt-3">
            <SimpleMarkdown content={bodyMd} />
          </div>
        )
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
        <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <FeedCommentThread
            comments={comments.data?.items ?? []}
            isLoggedIn={isLoggedIn}
            topLevelPending={commentMutation.isPending}
            replyPending={replyMutation.isPending}
            onAddComment={(body) => {
              if (!isLoggedIn) {
                router.push(`/login?next=${window.location.pathname}`)
                return
              }
              commentMutation.mutate(body)
            }}
            onAddReply={(parentId, body) => {
              if (!isLoggedIn) {
                router.push(`/login?next=${window.location.pathname}`)
                return
              }
              replyMutation.mutate({ parentId, body })
            }}
            currentUsername={user?.username}
          />
        </div>
      )}
    </article>
  )
}
