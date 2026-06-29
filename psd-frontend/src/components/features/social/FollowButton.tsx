'use client'

import { followUser, unfollowUser } from '@/lib/api/social'
import { useAuth } from '@/lib/auth/useAuth'
import clsx from 'clsx'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const baseClass =
  'inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-1.5 text-sm font-semibold motion-safe:transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-neutral-900'

export function FollowButton({
  username,
  isFollowing: initialFollowing,
  accent,
  className,
  onToggle,
}: {
  username: string
  isFollowing?: boolean
  accent?: string
  className?: string
  onToggle?: (following: boolean) => void
}) {
  const { user, isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [following, setFollowing] = useState(initialFollowing ?? false)

  useEffect(() => {
    setFollowing(initialFollowing ?? false)
  }, [initialFollowing])

  const mutation = useMutation({
    mutationFn: () => (following ? unfollowUser(username) : followUser(username)),
    onMutate: () => {
      const prev = following
      const next = !following
      setFollowing(next)
      onToggle?.(next)
      return { prev }
    },
    onSuccess: async (data) => {
      setFollowing(data.following)
      await qc.invalidateQueries({ queryKey: ['user', username] })
      await qc.invalidateQueries({ queryKey: ['feed-stats'] })
      await qc.invalidateQueries({ queryKey: ['discovery'] })
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) {
        setFollowing(ctx.prev)
        onToggle?.(ctx.prev)
      }
    },
  })

  if (user?.username === username) return null

  const accentStyle = accent
    ? ({ ['--follow-accent' as string]: accent } as React.CSSProperties)
    : undefined

  if (!isLoggedIn) {
    return (
      <Link
        href={`/login?next=/${username}`}
        className={clsx(
          baseClass,
          accent
            ? 'bg-[var(--follow-accent)] text-white hover:brightness-95'
            : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400',
          className,
        )}
        style={accentStyle}
      >
        Ikuti
      </Link>
    )
  }

  if (following) {
    return (
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        aria-pressed="true"
        title="Batal ikuti"
        className={clsx(
          baseClass,
          'cursor-pointer border border-neutral-300 bg-neutral-50 text-neutral-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-red-800 dark:hover:bg-red-950/40 dark:hover:text-red-300',
          className,
        )}
      >
        {mutation.isPending ? '…' : 'Mengikuti'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      aria-pressed="false"
      className={clsx(
        baseClass,
        'cursor-pointer text-white shadow-sm',
        accent
          ? 'bg-[var(--follow-accent)] hover:brightness-95'
          : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400',
        className,
      )}
      style={accentStyle}
    >
      {mutation.isPending ? '…' : 'Ikuti'}
    </button>
  )
}
