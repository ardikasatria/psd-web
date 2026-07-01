'use client'

import { ContentOwnerMenu } from '@/components/common/ContentOwnerMenu'
import { ContentReportMenu } from '@/components/common/ContentReportMenu'
import { ForumEngagementRow, ForumVoteControls } from '@/components/features/community/ForumEngagement'
import { ForumSidebar } from '@/components/features/community/ForumSidebar'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import {
  deleteForumPost,
  deleteForumThread,
  getThread,
  replyToThread,
  updateForumPost,
  updateForumThread,
} from '@/lib/api/community'
import { useAuth } from '@/lib/auth/useAuth'
import { buildNestedTree, type NestedItem } from '@/lib/utils/nestedReplies'
import { timeAgo } from '@/lib/utils/format'
import type { Post, ThreadDetail } from '@/types/api'
import Textarea from '@/shared/Textarea'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { ChevronLeftIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Avatar from '@/shared/Avatar'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useMemo, useState } from 'react'

function AuthorBadge({
  author,
  at,
  visibility,
}: {
  author: Post['author']
  at: string
  visibility?: 'public' | 'private'
}) {
  return (
    <div className="flex items-center gap-2">
      {author.avatar_url ? (
        <Avatar src={author.avatar_url} alt={author.username} className="size-8" width={32} height={32} sizes="32px" />
      ) : (
        <div className="size-8 rounded-full bg-neutral-200 dark:bg-neutral-600" />
      )}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/${author.username}`} className="text-sm font-medium text-neutral-800 hover:text-primary-600 dark:text-neutral-200">
            {author.username}
          </Link>
          {visibility === 'private' && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-neutral-500">
              <EyeSlashIcon className="size-3" />
              Hanya saya
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-500">{timeAgo(at)}</p>
      </div>
    </div>
  )
}

function MarkdownBody({ text }: { text: string }) {
  return (
    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-neutral-700 dark:prose-invert dark:text-neutral-300">
      {text}
    </div>
  )
}

function ForumReplyCard({
  post,
  threadId,
  depth,
  children,
  isLoggedIn,
  currentUsername,
  replyingToId,
  nestedReplyText,
  onStartReply,
  onCancelReply,
  onNestedReplyTextChange,
  onSubmitNestedReply,
  nestedReplyPending,
}: {
  post: Post
  threadId: string
  depth: number
  children: NestedItem<Post>[]
  isLoggedIn: boolean
  currentUsername?: string
  replyingToId: string | null
  nestedReplyText: string
  onStartReply: (id: string) => void
  onCancelReply: () => void
  onNestedReplyTextChange: (v: string) => void
  onSubmitNestedReply: (parentId: string) => void
  nestedReplyPending: boolean
}) {
  const qc = useQueryClient()
  const [bodyMd, setBodyMd] = useState(post.body_md)
  const [visibility, setVisibility] = useState(post.visibility ?? 'public')
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(post.body_md)
  const isReplying = replyingToId === post.id

  const updateMutation = useMutation({
    mutationFn: (patch: { body_md?: string; visibility?: 'public' | 'private' }) =>
      updateForumPost(post.id, patch),
    onSuccess: (updated) => {
      setBodyMd(updated.body_md)
      setVisibility(updated.visibility ?? 'public')
      setIsEditing(false)
      qc.invalidateQueries({ queryKey: ['thread', threadId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteForumPost(post.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thread', threadId] })
      qc.invalidateQueries({ queryKey: ['threads'] })
      qc.invalidateQueries({ queryKey: ['forum-stats'] })
    },
  })

  const shellClass =
    depth === 0
      ? 'flex gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800'
      : 'flex gap-3 border-s-2 border-neutral-200 ps-3 dark:border-neutral-600'

  return (
    <div className={depth === 0 ? '' : 'mt-3'}>
      <div className={shellClass}>
        <ForumVoteControls
          targetType="post"
          targetId={post.id}
          threadId={threadId}
          engagement={post}
          layout="vertical"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <AuthorBadge author={post.author} at={post.created_at} visibility={visibility} />
            {currentUsername === post.author.username && !isEditing && (
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
                deleteConfirmTitle="Hapus balasan?"
                deleteConfirmDescription="Balasan ini akan dihapus permanen dari thread. Tindakan ini tidak dapat dibatalkan."
              />
            )}
            {isLoggedIn && currentUsername !== post.author.username && !isEditing && (
              <ContentReportMenu kind="reply" targetId={post.id} className="shrink-0" />
            )}
          </div>
          {isEditing ? (
            <div className="mt-3 space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={4}
                className="!rounded-xl font-sans text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const text = editText.trim()
                    if (text) updateMutation.mutate({ body_md: text })
                  }}
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
            <div className="mt-3">
              {post.reply_to && (
                <Link
                  href={`/${post.reply_to.username}`}
                  className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  @{post.reply_to.username}{' '}
                </Link>
              )}
              <MarkdownBody text={bodyMd} />
            </div>
          )}
          <ForumEngagementRow
            targetType="post"
            targetId={post.id}
            threadId={threadId}
            engagement={post}
          />
          {isLoggedIn && depth < 1 && !isEditing && (
            <button
              type="button"
              onClick={() => onStartReply(post.id)}
              className="mt-2 text-xs font-medium text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400"
            >
              Balas
            </button>
          )}
          {isReplying && (
            <form
              className="mt-3 space-y-2"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                onSubmitNestedReply(post.id)
              }}
            >
              <Textarea
                value={nestedReplyText}
                onChange={(e) => onNestedReplyTextChange(e.target.value)}
                placeholder={`Balas @${post.author.username}...`}
                rows={3}
                className="!rounded-xl font-sans text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={nestedReplyPending || !nestedReplyText.trim()}>
                  Kirim
                </Button>
                <Button type="button" plain onClick={onCancelReply}>
                  Batal
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
      {children.length > 0 && (
        <div className="space-y-0">
          {children.map((child) => (
            <ForumReplyCard
              key={child.id}
              post={child}
              threadId={threadId}
              depth={depth + 1}
              children={child.children}
              isLoggedIn={isLoggedIn}
              currentUsername={currentUsername}
              replyingToId={replyingToId}
              nestedReplyText={nestedReplyText}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onNestedReplyTextChange={onNestedReplyTextChange}
              onSubmitNestedReply={onSubmitNestedReply}
              nestedReplyPending={nestedReplyPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ThreadDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [reply, setReply] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [nestedReplyText, setNestedReplyText] = useState('')
  const [isEditingThread, setIsEditingThread] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')

  const { data, isLoading, isError, error: loadError } = useQuery<ThreadDetail>({
    queryKey: ['thread', id],
    queryFn: () => getThread(id),
  })

  const isThreadOwner = isLoggedIn && user?.username === data?.author.username

  const postReply = useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId?: string | null }) =>
      replyToThread(id, body, parentId),
    onSuccess: () => {
      setReply('')
      setNestedReplyText('')
      setReplyingToId(null)
      setError(null)
      qc.invalidateQueries({ queryKey: ['thread', id] })
      qc.invalidateQueries({ queryKey: ['threads'] })
      qc.invalidateQueries({ queryKey: ['forum-stats'] })
      qc.invalidateQueries({ queryKey: ['my-quests'] })
    },
    onError: (e: Error) => setError(e.message),
  })

  const replyTree = useMemo(
    () => (data ? buildNestedTree(data.posts) : []),
    [data],
  )

  const updateThreadMutation = useMutation({
    mutationFn: (patch: {
      title?: string
      body_md?: string
      visibility?: 'public' | 'private'
    }) => updateForumThread(id, patch),
    onSuccess: () => {
      setIsEditingThread(false)
      qc.invalidateQueries({ queryKey: ['thread', id] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    },
  })

  const deleteThreadMutation = useMutation({
    mutationFn: () => deleteForumThread(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['threads'] })
      qc.invalidateQueries({ queryKey: ['forum-stats'] })
      router.push('/forum')
    },
  })

  return (
    <FeaturePageShell className="!pt-6">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <Link
            href="/forum"
            className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-primary-600 dark:hover:text-primary-400"
          >
            <ChevronLeftIcon className="size-4" />
            Kembali ke forum
          </Link>

          <QueryState isLoading={isLoading} isError={isError} error={loadError}>
            {data && (
              <article className="space-y-6">
                <header>
                  <div className="flex items-start justify-between gap-3">
                    {isEditingThread ? (
                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-2xl font-semibold text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                        />
                        <Textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={6}
                          className="!rounded-xl font-sans text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              const title = editTitle.trim()
                              const body_md = editBody.trim()
                              if (title && body_md) {
                                updateThreadMutation.mutate({ title, body_md })
                              }
                            }}
                            disabled={
                              updateThreadMutation.isPending ||
                              !editTitle.trim() ||
                              !editBody.trim()
                            }
                          >
                            {updateThreadMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                          </Button>
                          <Button
                            plain
                            onClick={() => setIsEditingThread(false)}
                            disabled={updateThreadMutation.isPending}
                          >
                            Batal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 sm:text-3xl">
                          {data.title}
                        </h1>
                        {(data.visibility ?? 'public') === 'private' && (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                            <EyeSlashIcon className="size-3.5" />
                            Hanya saya
                          </span>
                        )}
                      </div>
                    )}
                    {isThreadOwner && !isEditingThread && (
                      <ContentOwnerMenu
                        visibility={data.visibility ?? 'public'}
                        onEdit={() => {
                          setEditTitle(data.title)
                          setEditBody(data.body_md)
                          setIsEditingThread(true)
                        }}
                        onDelete={() => deleteThreadMutation.mutate()}
                        onVisibilityChange={(v) => updateThreadMutation.mutate({ visibility: v })}
                        deletePending={deleteThreadMutation.isPending}
                        visibilityPending={updateThreadMutation.isPending}
                        deleteConfirmTitle="Hapus thread?"
                        deleteConfirmDescription="Thread beserta semua balasannya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
                      />
                    )}
                    {isLoggedIn && !isThreadOwner && !isEditingThread && (
                      <ContentReportMenu kind="thread" targetId={data.id} className="shrink-0" />
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <AuthorBadge author={data.author} at={data.created_at} />
                    <span className="text-sm text-neutral-500">{data.replies} balasan</span>
                  </div>
                  {data.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {data.tags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/forum?tags=${encodeURIComponent(tag)}`}
                          className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:bg-neutral-700 dark:text-neutral-300"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </header>

                <div className="flex gap-3 rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
                  <ForumVoteControls
                    targetType="thread"
                    targetId={data.id}
                    threadId={data.id}
                    engagement={data}
                    layout="vertical"
                  />
                  <div className="min-w-0 flex-1">
                    <MarkdownBody text={data.body_md} />
                    <ForumEngagementRow
                      targetType="thread"
                      targetId={data.id}
                      threadId={data.id}
                      engagement={data}
                    />
                  </div>
                </div>

                <section>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    Balasan ({data.posts.length})
                  </h2>
                  <div className="mt-4 space-y-3">
                    {replyTree.map((p) => (
                      <ForumReplyCard
                        key={`${p.id}-${p.body_md}-${p.visibility ?? 'public'}`}
                        post={p}
                        threadId={data.id}
                        depth={0}
                        children={p.children}
                        isLoggedIn={isLoggedIn}
                        currentUsername={user?.username}
                        replyingToId={replyingToId}
                        nestedReplyText={nestedReplyText}
                        onStartReply={(postId) => {
                          setReplyingToId(postId)
                          setNestedReplyText('')
                        }}
                        onCancelReply={() => {
                          setReplyingToId(null)
                          setNestedReplyText('')
                        }}
                        onNestedReplyTextChange={setNestedReplyText}
                        onSubmitNestedReply={(parentId) => {
                          if (!nestedReplyText.trim()) return
                          postReply.mutate({ body: nestedReplyText.trim(), parentId })
                        }}
                        nestedReplyPending={postReply.isPending}
                      />
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-5 dark:border-neutral-700 dark:bg-neutral-800/80">
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Tulis balasan</h3>
                  {isLoggedIn ? (
                    <form
                      className="mt-3 space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!reply.trim()) {
                          setError('Balasan tidak boleh kosong')
                          return
                        }
                        postReply.mutate({ body: reply.trim() })
                      }}
                    >
                      <Textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        rows={4}
                        placeholder="Bagikan pendapat atau jawaban Anda..."
                        className="!rounded-xl font-sans text-sm"
                      />
                      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                      <ButtonPrimary type="submit" disabled={postReply.isPending}>
                        {postReply.isPending ? 'Mengirim...' : 'Kirim balasan'}
                      </ButtonPrimary>
                    </form>
                  ) : (
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <Link href={`/login?next=/forum/${id}`} className="font-medium text-primary-600 hover:underline">
                        Masuk
                      </Link>{' '}
                      untuk membalas diskusi ini.
                    </p>
                  )}
                </section>
              </article>
            )}
          </QueryState>
        </div>

        <ForumSidebar className="w-full shrink-0 lg:sticky lg:top-24 lg:w-72 xl:w-80" />
      </div>
    </FeaturePageShell>
  )
}
