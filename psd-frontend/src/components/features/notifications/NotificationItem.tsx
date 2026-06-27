'use client'

import type { Notification } from '@/types/api'
import Avatar from '@/shared/Avatar'
import { timeAgo } from '@/lib/utils/format'
import {
  AcademicCapIcon,
  BellIcon,
  CalendarDaysIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  MegaphoneIcon,
  TrophyIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'

const TYPE_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  follow: UserPlusIcon,
  post_like: HeartIcon,
  comment: ChatBubbleLeftIcon,
  instructor: AcademicCapIcon,
  course: AcademicCapIcon,
  competition: TrophyIcon,
  event: CalendarDaysIcon,
  announcement: MegaphoneIcon,
  generic: BellIcon,
}

function TypeIcon({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] ?? BellIcon
  return <Icon className="size-5 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
}

interface Props {
  notification: Notification
  onClick?: () => void
  compact?: boolean
}

export function NotificationItem({ notification, onClick, compact = false }: Props) {
  const { actor, title, body, read, created_at, type } = notification

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full gap-3 rounded-xl p-3 text-start transition',
        read
          ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
          : 'bg-primary-50/60 hover:bg-primary-50 dark:bg-primary-950/30 dark:hover:bg-primary-950/50',
        compact && 'p-2.5'
      )}
    >
      <div className="relative shrink-0">
        {actor ? (
          <Avatar
            src={actor.avatar_url ?? undefined}
            alt={actor.username}
            className={clsx(compact ? 'size-9' : 'size-10')}
            width={compact ? 36 : 40}
            height={compact ? 36 : 40}
            sizes="40px"
          />
        ) : (
          <span
            className={clsx(
              'flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700',
              compact ? 'size-9' : 'size-10'
            )}
          >
            <TypeIcon type={type} />
          </span>
        )}
        {!read && (
          <span
            className="absolute end-0 top-0 size-2.5 rounded-full bg-primary-500 ring-2 ring-white dark:ring-neutral-900"
            aria-hidden
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={clsx('text-sm text-neutral-900 dark:text-neutral-100', !read && 'font-medium')}>
          {title}
        </p>
        {body ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{body}</p>
        ) : null}
        <p className="mt-1 text-xs text-neutral-400">{timeAgo(created_at)}</p>
      </div>
    </button>
  )
}
