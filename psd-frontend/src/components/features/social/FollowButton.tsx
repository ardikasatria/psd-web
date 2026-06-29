'use client'

import { useToast } from '@/components/common/Toast'
import { followUser, unfollowUser } from '@/lib/api/social'
import { getApiErrorMessage } from '@/lib/api/errors'
import { useAuth } from '@/lib/auth/useAuth'
import clsx from 'clsx'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const baseClass =
  'relative z-10 inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg px-4 py-1.5 text-sm font-semibold motion-safe:transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-neutral-900'

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
  const { toast } = useToast()
  const qc = useQueryClient()
  const [following, setFollowing] = useState(initialFollowing ?? false)

  useEffect(() => {
    setFollowing(initialFollowing ?? false)
  }, [initialFollowing])

  const mutation = useMutation({
    mutationFn: (wantFollowing: boolean) =>
      wantFollowing ? followUser(username) : unfollowUser(username),
    onMutate: (wantFollowing) => {
      const prev = following
      setFollowing(wantFollowing)
      onToggle?.(wantFollowing)
      return { prev }
    },
    onSuccess: async (data) => {
      setFollowing(data.following)
      await qc.invalidateQueries({ queryKey: ['user', username] })
      await qc.invalidateQueries({ queryKey: ['feed-stats'] })
      await qc.invalidateQueries({ queryKey: ['discovery'] })
    },
    onError: (err, _wantFollowing, ctx) => {
      if (ctx) {
        setFollowing(ctx.prev)
        onToggle?.(ctx.prev)
      }
      toast(getApiErrorMessage(err, 'Gagal memperbarui status ikuti.'), 'error')
    },
  })

  if (user?.username === username) return null

  const accentStyle = accent
    ? ({ ['--follow-accent' as string]: accent } as React.CSSProperties)
    : undefined

  const handleClick = () => {
    if (mutation.isPending) return
    mutation.mutate(!following)
  }

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
        onClick={handleClick}
        disabled={mutation.isPending}
        aria-pressed="true"
        title="Batal ikuti"
        className={clsx(
          baseClass,
          'border border-neutral-300 bg-neutral-50 text-neutral-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-red-800 dark:hover:bg-red-950/40 dark:hover:text-red-300',
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
      onClick={handleClick}
      disabled={mutation.isPending}
      aria-pressed="false"
      className={clsx(
        baseClass,
        'text-white shadow-sm',
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
