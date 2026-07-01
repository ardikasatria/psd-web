'use client'

import { kindMeta } from '@/lib/search/kindMeta'
import type { SearchHit } from '@/types/api'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { shouldUnoptimizeImage } from '@/lib/images'
import clsx from 'clsx'
import Image from 'next/image'

/**
 * Baris hasil pencarian universal — ikon/avatar + judul + subjudul + badge kategori.
 * Dipakai di dropdown header maupun kartu di halaman /search. Aman dark & light.
 */
export function SearchHitRow({
  hit,
  focused = false,
  showBadge = true,
  className,
}: {
  hit: SearchHit
  focused?: boolean
  showBadge?: boolean
  className?: string
}) {
  const meta = kindMeta(hit.kind)
  const Icon = meta.icon
  const isAccount = hit.kind === 'user' || hit.kind === 'org'

  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 motion-safe:transition-colors',
        focused && 'bg-neutral-100 dark:bg-neutral-700/60',
        className,
      )}
    >
      <div className="shrink-0">
        {isAccount && hit.avatar_url ? (
          <Image
            src={hit.avatar_url}
            alt=""
            width={40}
            height={40}
            unoptimized={shouldUnoptimizeImage(hit.avatar_url)}
            className="size-10 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
          />
        ) : (
          <span
            className={clsx(
              'flex size-10 items-center justify-center rounded-full',
              isAccount ? 'rounded-full' : 'rounded-xl',
              meta.iconWrap,
            )}
          >
            <Icon className="size-5" aria-hidden />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {hit.title}
          </p>
          {hit.is_official && <OfficialBadge className="!text-[10px]" />}
        </div>
        {hit.subtitle && (
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{hit.subtitle}</p>
        )}
      </div>

      {showBadge && (
        <span
          className={clsx(
            'hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-block',
            meta.badge,
          )}
        >
          {meta.label}
        </span>
      )}
    </div>
  )
}
