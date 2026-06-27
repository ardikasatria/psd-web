'use client'

import { followUser, unfollowUser } from '@/lib/api/social'
import { useAuth } from '@/lib/auth/useAuth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function FollowButton({
  username,
  isFollowing: initialFollowing,
  accent,
  className,
}: {
  username: string
  isFollowing?: boolean
  accent?: string
  className?: string
}) {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [following, setFollowing] = useState(initialFollowing ?? false)

  const mutation = useMutation({
    mutationFn: () => (following ? unfollowUser(username) : followUser(username)),
    onMutate: () => {
      const prev = following
      setFollowing(!following)
      return { prev }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['user', username] })
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) setFollowing(ctx.prev)
    },
  })

  if (user?.username === username) return null

  if (!isLoggedIn) {
    return (
      <ButtonPrimary
        href={`/login?next=/${username}`}
        className={clsx('!rounded-lg !px-4 !py-1.5 !text-sm', className)}
        style={accent ? { backgroundColor: 'var(--psd-accent)', borderColor: 'var(--psd-accent)' } : undefined}
      >
        Ikuti
      </ButtonPrimary>
    )
  }

  return (
    <Button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className={clsx(
        '!rounded-lg !px-4 !py-1.5 !text-sm font-medium motion-safe:transition-colors',
        following
          ? 'border-neutral-300 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200'
          : 'text-white',
        className
      )}
      style={
        !following && accent
          ? { backgroundColor: 'var(--psd-accent)', borderColor: 'var(--psd-accent)' }
          : undefined
      }
    >
      {following ? 'Mengikuti' : 'Ikuti'}
    </Button>
  )
}
