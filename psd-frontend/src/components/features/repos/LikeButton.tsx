'use client'

import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { likeRepo, unlikeRepo } from '@/lib/api/repos'
import { useAuth } from '@/lib/auth/useAuth'
import { Button } from '@/shared/Button'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface LikeButtonProps {
  repoId: string
  initialLiked: boolean
  initialLikes: number
  className?: string
}

export function LikeButton({ repoId, initialLiked, initialLikes, className }: LikeButtonProps) {
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const [liked, setLiked] = useState(initialLiked)
  const [likes, setLikes] = useState(initialLikes)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (!isLoggedIn) {
      router.push(`/login?next=${window.location.pathname}`)
      return
    }

    const prevLiked = liked
    const prevLikes = likes
    setBusy(true)
    setLiked(!liked)
    setLikes(likes + (liked ? -1 : 1))

    try {
      const res = liked ? await unlikeRepo(repoId) : await likeRepo(repoId)
      setLiked(res.liked)
      setLikes(res.likes)
    } catch {
      setLiked(prevLiked)
      setLikes(prevLikes)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={toggle}
      disabled={busy}
      outline
      aria-pressed={liked}
      className={clsx(
        liked && '!border-primary-300 !bg-primary-50 !text-primary-700 dark:!bg-primary-950/40 dark:!text-primary-300',
        className
      )}
    >
      {liked ? (
        <HeartSolidIcon className="size-4 text-primary-600" data-slot="icon" aria-hidden />
      ) : (
        <HeartIcon className="size-4" data-slot="icon" aria-hidden />
      )}
      {liked ? 'Disukai' : 'Suka'} · {likes}
    </Button>
  )
}
