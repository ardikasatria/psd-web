'use client'

import clsx from 'clsx'
import Image from 'next/image'
import { shouldUnoptimizeImage } from '@/lib/images'
import type { Profile } from '@/types/api'

const DEFAULT_ACCENT = '#4572b7'

export function ProfileCover({
  profile,
  className,
}: {
  profile: Profile
  className?: string
}) {
  const accent = profile.accent_color ?? DEFAULT_ACCENT

  return (
    <div className={clsx('relative overflow-hidden', className)}>
      {profile.banner_url ? (
        <Image
          src={profile.banner_url}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 1200px"
          priority
          unoptimized={shouldUnoptimizeImage(profile.banner_url)}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 45%, #f09394) 100%)`,
          }}
        />
      )}
    </div>
  )
}

export function ProfileAvatar({
  profile,
  size = 'md',
  className,
}: {
  profile: Profile
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const accent = profile.accent_color ?? DEFAULT_ACCENT
  const sizes = {
    sm: { box: 'size-14', text: 'text-lg', img: '56px' },
    md: { box: 'size-20', text: 'text-2xl', img: '80px' },
    lg: { box: 'size-24', text: 'text-3xl', img: '96px' },
  }[size]

  return (
    <div
      className={clsx(
        'relative isolate shrink-0 overflow-hidden rounded-full bg-white ring-4 ring-white dark:bg-neutral-900 dark:ring-neutral-900',
        sizes.box,
        className
      )}
      style={{ boxShadow: `0 0 0 3px ${accent}` }}
    >
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt={profile.name}
          fill
          className="object-cover"
          sizes={sizes.img}
          unoptimized={shouldUnoptimizeImage(profile.avatar_url)}
        />
      ) : (
        <div
          className={clsx(
            'absolute inset-0 flex items-center justify-center font-bold text-white',
            sizes.text
          )}
          style={{ backgroundColor: accent }}
        >
          {profile.name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}
