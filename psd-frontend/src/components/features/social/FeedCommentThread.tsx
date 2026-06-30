'use client'

import { buildNestedTree } from '@/lib/utils/nestedReplies'
import { profilePath } from '@/lib/routes/profile'
import { ContentReportMenu } from '@/components/common/ContentReportMenu'
import type { OwnerRef, SocialComment } from '@/types/api'
import { Button } from '@/shared/Button'
import Textarea from '@/shared/Textarea'
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

function CommentBody({
  author,
  replyTo,
  body,
  createdAt,
  onReply,
  canReply,
}: {
  author: OwnerRef
  replyTo?: OwnerRef | null
  body: string
  createdAt: string
  onReply?: () => void
  canReply?: boolean
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
        <Link
          href={profilePath(author.username)}
          className="font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          @{author.username}
        </Link>
        <span className="text-xs text-neutral-400">{timeAgo(createdAt)}</span>
      </div>
      <p className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">
        {replyTo && (
          <Link
            href={profilePath(replyTo.username)}
            className="font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            @{replyTo.username}{' '}
          </Link>
        )}
        {body}
      </p>
      {canReply && onReply && (
        <button
          type="button"
          onClick={onReply}
          className="mt-1 text-xs font-medium text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400"
        >
          Balas
        </button>
      )}
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
  const isReplying = replyingToId === comment.id

  return (
    <div className={depth > 0 ? 'ms-6 border-s-2 border-neutral-100 ps-3 dark:border-neutral-800' : ''}>
      <div className="flex gap-2 py-2">
        <CommentBody
          author={comment.author}
          replyTo={comment.reply_to}
          body={comment.body_md}
          createdAt={comment.created_at}
          canReply={isLoggedIn && depth < 1}
          onReply={() => onStartReply(comment.id)}
        />
        {isLoggedIn && currentUsername !== comment.author.username && (
          <ContentReportMenu kind="comment" targetId={comment.id} className="shrink-0" />
        )}
      </div>
      {isReplying && (
        <form
          className="mb-2 ms-2 space-y-2"
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
      {comment.children.length > 0 && (
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
    <div className="space-y-1">
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
