'use client'

import { CategoryBadge } from '@/components/common/CategoryBadge'
import { RoomStatusBadge } from '@/components/features/rooms/room-utils'
import { RoomSummary } from '@/types/api'
import {
  ChatBubbleLeftEllipsisIcon,
  ClockIcon,
  LightBulbIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

const STATUS_ACCENT: Record<string, string> = {
  open: 'from-sky-400 to-indigo-500',
  framing: 'from-primary-400 to-rose-400',
  closed: 'from-amber-400 to-orange-400',
  generating: 'from-cyan-400 to-sky-500',
  solving: 'from-indigo-400 to-violet-500',
  submitted: 'from-blue-400 to-indigo-500',
  finished: 'from-emerald-400 to-teal-500',
  challenged: 'from-rose-400 to-primary-500',
  draft: 'from-neutral-400 to-neutral-500',
}

function RoomCoverFallback({ status }: { status: string }) {
  const accent = STATUS_ACCENT[status] ?? 'from-primary-500 to-indigo-600'
  return (
    <div className={clsx('absolute inset-0 bg-gradient-to-br', accent)}>
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -end-8 -top-8 size-32 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -bottom-4 start-1/4 size-24 rounded-full bg-white/15 blur-xl" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <LightBulbIcon className="size-10 text-white/40" aria-hidden />
      </div>
    </div>
  )
}

function formatDeadline(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'Framing berakhir'
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) return `${hours} jam lagi`
  const days = Math.ceil(hours / 24)
  return `${days} hari lagi`
}

export function RoomCard({ room }: { room: RoomSummary }) {
  const capacity =
    room.max_members != null ? `${room.member_count}/${room.max_members}` : String(room.member_count)
  const fillPct =
    room.max_members != null && room.max_members > 0
      ? Math.min(100, Math.round((room.member_count / room.max_members) * 100))
      : null
  const [coverFailed, setCoverFailed] = useState(false)
  const showCover = room.cover_url && !coverFailed
  const accent = STATUS_ACCENT[room.status] ?? 'from-primary-500 to-indigo-600'

  return (
    <Link
      href={`/idea-rooms/${room.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800"
    >
      <div className={clsx('h-1 w-full bg-gradient-to-r', accent)} />
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {showCover ? (
          <Image
            src={room.cover_url!}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            unoptimized
            onError={() => setCoverFailed(true)}
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        ) : (
          <RoomCoverFallback status={room.status} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
        <div className="absolute end-3 top-3 flex flex-col items-end gap-2">
          <RoomStatusBadge status={room.status} className="shadow-sm backdrop-blur-sm" />
          {room.status === 'framing' && room.framing_deadline && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-primary-700 shadow-sm backdrop-blur-sm dark:bg-neutral-900/90 dark:text-primary-300">
              <ClockIcon className="size-3" aria-hidden />
              {formatDeadline(room.framing_deadline)}
            </span>
          )}
        </div>
        {room.status === 'open' && fillPct != null && fillPct >= 70 && (
          <span className="absolute bottom-3 start-3 rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            Hampir penuh
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-lg font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
          {room.title}
        </h3>
        {room.pitch_preview && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {room.pitch_preview}
          </p>
        )}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <UserGroupIcon className="size-4 shrink-0" aria-hidden />
              {capacity} anggota
            </span>
            {room.status === 'framing' && (room.components_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400">
                <ChatBubbleLeftEllipsisIcon className="size-3.5" aria-hidden />
                {room.components_count} komponen
              </span>
            )}
          </div>
          {fillPct != null && (
            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
              <div
                className={clsx(
                  'h-full rounded-full transition-all',
                  fillPct >= 90 ? 'bg-amber-500' : 'bg-gradient-to-r from-primary-400 to-sky-400',
                )}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          )}
        </div>
        <CategoryBadge category={room.category} subcategory={room.subcategory} className="mt-3" />
      </div>
    </Link>
  )
}
