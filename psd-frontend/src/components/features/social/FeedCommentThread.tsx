'use client'

import { ProfileAvatar } from '@/components/features/users/ProfileCover'
import { buildNestedTree } from '@/lib/utils/nestedReplies'
import { profilePath } from '@/lib/routes/profile'
import { ContentReportMenu } from '@/components/common/ContentReportMenu'
import type { OwnerRef, Profile, SocialComment } from '@/types/api'
import { Button } from '@/shared/Button'
import Textarea from '@/shared/Textarea'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} mnt`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function ownerToProfile(author: OwnerRef): Profile {
  return {
    id: author.username,
    username: author.username,
    name: author.name ?? author.username,
    avatar_url: author.avatar_url,
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
    is_official: author.is_official ?? false,
    is_instructor: false,
    account_type: author.type === 'org' ? 'organization' : 'individual',
    role: 'member',
    email_verified: true,
    created_at: new Date().toISOString(),
  }
}

function CommentBody({
  author,
  replyTo,
  body,
  createdAt,
  collapsed,
  onToggle,
  onReply,
  canReply,
}: {
  author: OwnerRef
  replyTo?: OwnerRef | null
  body: string
  createdAt: string
  collapsed: boolean
  onToggle: () => void
  onReply?: () => void
  canReply?: boolean
}) {
  const profile = ownerToProfile(author)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      className={clsx(
        'min-w-0 flex-1 cursor-pointer rounded-lg text-left motion-safe:transition-colors',
        'hover:bg-neutral-50 dark:hover:bg-neutral-800/60',
        collapsed ? 'px-1 py-0.5' : 'px-1 py-1',
      )}
    >
      <div className="flex items-start gap-2">
        <Link
          href={profilePath(author.username)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        >
          <ProfileAvatar profile={profile} size="xs" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link
              href={profilePath(author.username)}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-semibold leading-none text-neutral-900 hover:underline dark:text-neutral-100"
            >
              @{author.username}
            </Link>
            <span className="text-xs leading-none text-neutral-400">{timeAgo(createdAt)}</span>
            {collapsed ? (
              <ChevronDownIcon className="size-3.5 text-neutral-400" aria-hidden />
            ) : (
              <ChevronUpIcon className="size-3.5 text-neutral-400" aria-hidden />
            )}
          </div>
          {!collapsed && (
            <>
              <p className="mt-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                {replyTo && (
                  <Link
                    href={profilePath(replyTo.username)}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    @{replyTo.username}{' '}
                  </Link>
                )}
                {body}
              </p>
              {canReply && onReply && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onReply()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      e.preventDefault()
                      onReply()
                    }
                  }}
                  className="mt-1 inline-block text-xs font-medium text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  Balas
                </span>
              )}
            </>
          )}
          {collapsed && (
            <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">{body}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function CommentNode({
  comment,
  depth,
  isLoggedIn,
  replyingToId,
  replyText,
  onStartReply,
  onCancelReply,
  onReplyTextChange,
  onSubmitReply,
  replyPending,
  currentUsername,
}: {
  comment: SocialComment & { children: (SocialComment & { children: SocialComment[] })[] }
  depth: number
  isLoggedIn: boolean
  replyingToId: string | null
  replyText: string
  onStartReply: (id: string) => void
  onCancelReply: () => void
  onReplyTextChange: (v: string) => void
  onSubmitReply: (parentId: string) => void
  replyPending: boolean
  currentUsername?: string
}) {
  const [collapsed, setCollapsed] = useState(true)
  const isReplying = replyingToId === comment.id

  return (
    <div className={depth > 0 ? 'ms-8 border-s border-neutral-100 ps-2 dark:border-neutral-800' : ''}>
      <div className="flex items-start gap-1 py-1">
        <CommentBody
          author={comment.author}
          replyTo={comment.reply_to}
          body={comment.body_md}
          createdAt={comment.created_at}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          canReply={isLoggedIn && depth < 1 && !collapsed}
          onReply={() => onStartReply(comment.id)}
        />
        {isLoggedIn && currentUsername !== comment.author.username && (
          <div className="shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
            <ContentReportMenu kind="comment" targetId={comment.id} />
          </div>
        )}
      </div>
      {isReplying && !collapsed && (
        <form
          className="mb-2 ms-10 space-y-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            onSubmitReply(comment.id)
          }}
        >
          <Textarea
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            placeholder={`Balas @${comment.author.username}...`}
            rows={2}
            className="!rounded-xl !text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={replyPending || !replyText.trim()}>
              Kirim
            </Button>
            <Button type="button" plain onClick={onCancelReply}>
              Batal
            </Button>
          </div>
        </form>
      )}
      {!collapsed && comment.children.length > 0 && (
        <div className="space-y-0">
          {comment.children.map((child) => (
            <CommentNode
              key={child.id}
              comment={child}
              depth={depth + 1}
              isLoggedIn={isLoggedIn}
              replyingToId={replyingToId}
              replyText={replyText}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onReplyTextChange={onReplyTextChange}
              onSubmitReply={onSubmitReply}
              replyPending={replyPending}
              currentUsername={currentUsername}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FeedCommentThread({
  comments,
  isLoggedIn,
  onAddComment,
  onAddReply,
  topLevelPending,
  replyPending,
  currentUsername,
}: {
  comments: SocialComment[]
  isLoggedIn: boolean
  onAddComment: (body: string) => void
  onAddReply: (parentId: string, body: string) => void
  topLevelPending?: boolean
  replyPending?: boolean
  currentUsername?: string
}) {
  const tree = useMemo(() => buildNestedTree(comments), [comments])
  const [commentText, setCommentText] = useState('')
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  return (
    <div className="space-y-0.5">
      {tree.length > 0 && (
        <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
          Ketuk komentar untuk membuka atau menyembunyikan isinya.
        </p>
      )}
      {tree.map((comment) => (
        <CommentNode
          key={comment.id}
          comment={comment}
          depth={0}
          isLoggedIn={isLoggedIn}
          replyingToId={replyingToId}
          replyText={replyText}
          onStartReply={(id) => {
            setReplyingToId(id)
            setReplyText('')
          }}
          onCancelReply={() => {
            setReplyingToId(null)
            setReplyText('')
          }}
          onReplyTextChange={setReplyText}
          onSubmitReply={(parentId) => {
            if (!replyText.trim()) return
            onAddReply(parentId, replyText.trim())
            setReplyingToId(null)
            setReplyText('')
          }}
          replyPending={!!replyPending}
          currentUsername={currentUsername}
        />
      ))}
      {isLoggedIn && (
        <form
          className="flex gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!commentText.trim()) return
            onAddComment(commentText.trim())
            setCommentText('')
          }}
        >
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Tulis komentar..."
            rows={2}
            className="min-w-0 flex-1 !rounded-xl !text-sm"
          />
          <Button type="submit" disabled={topLevelPending || !commentText.trim()}>
            Kirim
          </Button>
        </form>
      )}
    </div>
  )
}
