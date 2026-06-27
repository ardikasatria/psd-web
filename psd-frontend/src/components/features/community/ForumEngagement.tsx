'use client'

import {
  FORUM_REACTION_EMOJIS,
  reactForumPost,
  reactForumThread,
  voteForumPost,
  voteForumThread,
} from '@/lib/api/community'
import { useAuth } from '@/lib/auth/useAuth'
import type { ForumEngagement, ForumReactionSummary, ThreadDetail } from '@/types/api'
import clsx from 'clsx'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { ChevronDownIcon as ChevronDownSolid, ChevronUpIcon as ChevronUpSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

type TargetType = 'thread' | 'post'

function defaultEngagement(): ForumEngagement {
  return { score: 0, upvotes: 0, downvotes: 0, user_vote: null, reactions: [] }
}

export function ForumVoteControls({
  targetType,
  targetId,
  threadId,
  engagement,
  layout = 'horizontal',
}: {
  targetType: TargetType
  targetId: string
  threadId?: string
  engagement?: ForumEngagement
  layout?: 'horizontal' | 'vertical'
}) {
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const data = engagement ?? defaultEngagement()
  const [score, setScore] = useState(data.score)
  const [userVote, setUserVote] = useState(data.user_vote)

  useEffect(() => {
    setScore(data.score)
    setUserVote(data.user_vote)
  }, [data.score, data.user_vote])

  const vote = async (value: 1 | -1) => {
    if (!isLoggedIn) return
    if (busy) return
    const nextVote = userVote === value ? 0 : value
    const prev = { score, userVote }
    const delta =
      (nextVote === 1 ? 1 : 0) -
      (userVote === 1 ? 1 : 0) -
      (nextVote === -1 ? 1 : 0) +
      (userVote === -1 ? 1 : 0)
    setScore((s) => s + delta)
    setUserVote(nextVote === 0 ? null : nextVote)
    setBusy(true)
    try {
      const fn = targetType === 'thread' ? voteForumThread : voteForumPost
      const res = await fn(targetId, nextVote as 1 | -1 | 0)
      setScore(res.score)
      setUserVote(res.user_vote)
      if (threadId) qc.invalidateQueries({ queryKey: ['thread', threadId] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    } catch {
      setScore(prev.score)
      setUserVote(prev.userVote)
    } finally {
      setBusy(false)
    }
  }

  const loginNext = threadId ? `/forum/${threadId}` : '/forum'

  return (
    <div
      className={clsx(
        'flex shrink-0 items-center gap-0.5 rounded-xl border border-neutral-200/80 bg-neutral-50 p-1 dark:border-neutral-600 dark:bg-neutral-900/50',
        layout === 'vertical' && 'flex-col',
      )}
    >
      {isLoggedIn ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => vote(1)}
            className={clsx(
              'rounded-lg p-1.5 transition',
              userVote === 1
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-primary-600 dark:hover:bg-neutral-800',
            )}
            aria-label="Upvote"
            aria-pressed={userVote === 1}
          >
            {userVote === 1 ? (
              <ChevronUpSolid className="size-5" />
            ) : (
              <ChevronUpIcon className="size-5" />
            )}
          </button>
          <span
            className={clsx(
              'min-w-[2ch] text-center text-sm font-semibold tabular-nums',
              score > 0 && 'text-primary-600 dark:text-primary-400',
              score < 0 && 'text-red-600 dark:text-red-400',
              score === 0 && 'text-neutral-600 dark:text-neutral-400',
            )}
          >
            {score}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => vote(-1)}
            className={clsx(
              'rounded-lg p-1.5 transition',
              userVote === -1
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800',
            )}
            aria-label="Downvote"
            aria-pressed={userVote === -1}
          >
            {userVote === -1 ? (
              <ChevronDownSolid className="size-5" />
            ) : (
              <ChevronDownIcon className="size-5" />
            )}
          </button>
        </>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(loginNext)}`}
          className="flex flex-col items-center gap-0.5 px-2 py-1 text-xs text-neutral-500 hover:text-primary-600"
        >
          <span className="text-sm font-semibold tabular-nums">{score}</span>
          <span>vote</span>
        </Link>
      )}
    </div>
  )
}

export function ForumReactionBar({
  targetType,
  targetId,
  threadId,
  reactions,
}: {
  targetType: TargetType
  targetId: string
  threadId?: string
  reactions: ForumReactionSummary[]
}) {
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [local, setLocal] = useState(reactions)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    setLocal(reactions)
  }, [reactions])

  const toggle = async (emoji: string) => {
    if (!isLoggedIn) return
    if (busy) return
    const existing = local.find((r) => r.emoji === emoji)
    const optimistic = [...local]
    if (existing?.reacted) {
      const idx = optimistic.findIndex((r) => r.emoji === emoji)
      if (existing.count <= 1) optimistic.splice(idx, 1)
      else optimistic[idx] = { ...existing, count: existing.count - 1, reacted: false }
    } else if (existing) {
      const idx = optimistic.findIndex((r) => r.emoji === emoji)
      optimistic[idx] = { ...existing, count: existing.count + 1, reacted: true }
    } else {
      optimistic.push({ emoji, count: 1, reacted: true })
    }
    setLocal(optimistic)
    setBusy(emoji)
    setPickerOpen(false)
    try {
      const fn = targetType === 'thread' ? reactForumThread : reactForumPost
      const res = await fn(targetId, emoji)
      setLocal(res.reactions)
      if (threadId) qc.invalidateQueries({ queryKey: ['thread', threadId] })
    } catch {
      setLocal(reactions)
    } finally {
      setBusy(null)
    }
  }

  const loginNext = threadId ? `/forum/${threadId}` : '/forum'

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {local.map((r) => (
        <button
          key={r.emoji}
          type="button"
          disabled={!isLoggedIn || busy === r.emoji}
          onClick={() => toggle(r.emoji)}
          className={clsx(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition',
            r.reacted
              ? 'border-primary-300 bg-primary-50 text-primary-800 dark:border-primary-700 dark:bg-primary-950/50 dark:text-primary-200'
              : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200',
          )}
          aria-pressed={r.reacted}
        >
          <span>{r.emoji}</span>
          <span className="text-xs font-medium tabular-nums">{r.count}</span>
        </button>
      ))}
      {isLoggedIn ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="rounded-full border border-dashed border-neutral-300 px-2 py-0.5 text-sm text-neutral-500 transition hover:border-primary-300 hover:text-primary-600 dark:border-neutral-600"
          >
            + Reaksi
          </button>
          {pickerOpen && (
            <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-0.5 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-600 dark:bg-neutral-800">
              {FORUM_REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={!!busy}
                  onClick={() => toggle(emoji)}
                  className="rounded-lg p-1.5 text-lg transition hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(loginNext)}`}
          className="rounded-full border border-dashed border-neutral-300 px-2 py-0.5 text-xs text-neutral-500 hover:text-primary-600"
        >
          + Reaksi
        </Link>
      )}
    </div>
  )
}

export function ForumEngagementRow({
  targetType,
  targetId,
  threadId,
  engagement,
}: {
  targetType: TargetType
  targetId: string
  threadId: string
  engagement?: ForumEngagement
}) {
  const data = engagement ?? defaultEngagement()
  return (
    <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-700">
      <ForumReactionBar
        targetType={targetType}
        targetId={targetId}
        threadId={threadId}
        reactions={data.reactions}
      />
    </div>
  )
}
