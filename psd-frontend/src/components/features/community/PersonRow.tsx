'use client'

import { FollowButton } from '@/components/features/social/FollowButton'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { profilePath } from '@/lib/routes/profile'
import type { DiscoveryRef } from '@/types/api'
import Avatar from '@/shared/Avatar'
import clsx from 'clsx'
import Link from 'next/link'
import { UserGroupIcon } from '@heroicons/react/24/outline'

type Props = {
  person: DiscoveryRef
  isFollowing?: boolean
  onFollowed?: (username: string) => void
  className?: string
}

export function PersonRow({ person, isFollowing, onFollowed, className }: Props) {
  return (
    <li
      className={clsx(
        'flex items-center gap-3 rounded-xl p-2 motion-safe:transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60',
        className,
      )}
    >
      <Link href={profilePath(person.username)} className="shrink-0">
        {person.avatar_url ? (
          <Avatar src={person.avatar_url} alt={person.username} className="size-9" width={36} height={36} sizes="36px" />
        ) : (
          <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-neutral-800">
            <UserGroupIcon className="size-4 text-primary-600 dark:text-primary-400" aria-hidden />
          </div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={profilePath(person.username)}
            className="truncate text-sm font-semibold text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-400"
          >
            @{person.username}
          </Link>
          {person.is_official && <OfficialBadge className="!text-[9px]" />}
          {person.tier && (
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
              {person.tier}
            </span>
          )}
        </div>
        <span className="mt-0.5 inline-flex max-w-full truncate rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
          {person.reason}
        </span>
      </div>

      <FollowButton
        username={person.username}
        isFollowing={isFollowing}
        className="shrink-0"
        onToggle={(following) => {
          if (following) onFollowed?.(person.username)
        }}
      />
    </li>
  )
}
