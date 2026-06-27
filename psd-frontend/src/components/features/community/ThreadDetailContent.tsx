'use client'

import { ForumEngagementRow, ForumVoteControls } from '@/components/features/community/ForumEngagement'
import { ForumSidebar } from '@/components/features/community/ForumSidebar'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { getThread, replyToThread } from '@/lib/api/community'
import { useAuth } from '@/lib/auth/useAuth'
import { timeAgo } from '@/lib/utils/format'
import type { Post, ThreadDetail } from '@/types/api'
import Textarea from '@/shared/Textarea'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Avatar from '@/shared/Avatar'
import Link from 'next/link'
import { useState } from 'react'

function AuthorBadge({ author, at }: { author: Post['author']; at: string }) {
  return (
    <div className="flex items-center gap-2">
      {author.avatar_url ? (
        <Avatar src={author.avatar_url} alt={author.username} className="size-8" width={32} height={32} sizes="32px" />
      ) : (
        <div className="size-8 rounded-full bg-neutral-200 dark:bg-neutral-600" />
      )}
      <div>
        <Link href={`/${author.username}`} className="text-sm font-medium text-neutral-800 hover:text-primary-600 dark:text-neutral-200">
          {author.username}
        </Link>
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

export function ThreadDetailContent({ id }: { id: string }) {
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [reply, setReply] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, isError, error: loadError } = useQuery<ThreadDetail>({
    queryKey: ['thread', id],
    queryFn: () => getThread(id),
  })

  const postReply = useMutation({
    mutationFn: () => replyToThread(id, reply.trim()),
    onSuccess: () => {
      setReply('')
      setError(null)
      qc.invalidateQueries({ queryKey: ['thread', id] })
      qc.invalidateQueries({ queryKey: ['threads'] })
      qc.invalidateQueries({ queryKey: ['forum-stats'] })
      qc.invalidateQueries({ queryKey: ['my-quests'] })
    },
    onError: (e: Error) => setError(e.message),
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
                  <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 sm:text-3xl">{data.title}</h1>
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
                    {data.posts.map((p: Post) => (
                      <div
                        key={p.id}
                        className="flex gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
                      >
                        <ForumVoteControls
                          targetType="post"
                          targetId={p.id}
                          threadId={data.id}
                          engagement={p}
                          layout="vertical"
                        />
                        <div className="min-w-0 flex-1">
                          <AuthorBadge author={p.author} at={p.created_at} />
                          <div className="mt-3">
                            <MarkdownBody text={p.body_md} />
                          </div>
                          <ForumEngagementRow
                            targetType="post"
                            targetId={p.id}
                            threadId={data.id}
                            engagement={p}
                          />
                        </div>
                      </div>
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
                        postReply.mutate()
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
