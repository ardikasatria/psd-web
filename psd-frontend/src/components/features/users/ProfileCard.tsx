'use client'

import { useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { CalendarDaysIcon, LinkIcon, MapPinIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import type { Profile, UserProfile } from '@/types/api'
import { AchievementBadge, BADGE_META } from '@/components/features/gamification/AchievementBadge'
import { TierBadge } from '@/components/features/gamification/TierBadge'
import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { FollowButton } from '@/components/features/social/FollowButton'
import { FollowListDialog } from '@/components/features/social/FollowListDialog'
import { ProfileAvatar, ProfileCover } from '@/components/features/users/ProfileCover'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'

const DEFAULT_ACCENT = '#4572b7'

type ProfileCardProps = {
  profile: Profile | UserProfile
  isOwner?: boolean
  isFollowing?: boolean
  className?: string
  /** @deprecated use variant="preview" */
  compact?: boolean
  variant?: 'sidebar' | 'preview'
}

function memberSince(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

export function ProfileCard({
  profile,
  isOwner,
  isFollowing,
  className,
  compact,
  variant = compact ? 'preview' : 'sidebar',
}: ProfileCardProps) {
  const accent = profile.accent_color ?? DEFAULT_ACCENT
  const hasStatus = profile.status_emoji || profile.status_text
  const stats = 'stats' in profile ? profile.stats : undefined
  const followersCount =
    'followers_count' in profile && profile.followers_count !== undefined
      ? profile.followers_count
      : stats?.followers
  const followingCount = 'following_count' in profile ? profile.following_count : undefined
  const reputation = 'reputation' in profile ? profile.reputation : undefined
  const tier = 'tier' in profile ? profile.tier : undefined
  const earnedBadges = 'badges' in profile ? profile.badges ?? [] : []
  const [followDialog, setFollowDialog] = useState<'followers' | 'following' | null>(null)

  if (variant === 'preview') {
    return (
      <PreviewCard
        profile={profile}
        isOwner={isOwner}
        className={className}
        accent={accent}
        hasStatus={hasStatus}
        stats={stats}
      />
    )
  }

  return (
    <aside
      className={clsx(
        'profile relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900',
        'lg:z-20 lg:overflow-visible lg:sticky lg:top-24',
        className
      )}
      style={{ ['--psd-accent' as string]: accent }}
    >
      {isOwner && (
        <div className="absolute end-4 top-4 z-10 hidden lg:block">
          <ButtonPrimary href="/settings/profile" className="!rounded-lg !px-3 !py-1.5 !text-xs">
            <PencilSquareIcon className="mr-1 inline size-3.5" aria-hidden />
            Edit
          </ButtonPrimary>
        </div>
      )}
      {!isOwner && variant === 'sidebar' && (
        <div className="absolute end-4 top-4 z-10 hidden lg:block">
          <FollowButton username={profile.username} isFollowing={isFollowing} accent={accent} />
        </div>
      )}

      {/* Mobile: cover di belakang avatar */}
      <div className="relative lg:hidden">
        <ProfileCover profile={profile} className="h-28" />
        <div className="relative px-5 pb-1">
          <div className="-mt-10 mb-3 flex items-end justify-between gap-3">
            <div className="relative">
              <ProfileAvatar profile={profile} size="md" />
              {hasStatus && (
                <span
                  className="absolute -bottom-0.5 -end-0.5 size-4 rounded-full border-[3px] border-white bg-emerald-500 dark:border-neutral-900"
                  aria-hidden
                />
              )}
            </div>
            {isOwner && (
              <ButtonPrimary href="/settings/profile" className="!rounded-lg !px-3 !py-1.5 !text-xs">
                <PencilSquareIcon className="mr-1 inline size-3.5" aria-hidden />
                Edit
              </ButtonPrimary>
            )}
            {!isOwner && <FollowButton username={profile.username} isFollowing={isFollowing} accent={accent} />}
          </div>

          <p className="font-mono text-sm font-bold text-neutral-900 dark:text-white">@{profile.username}</p>
          {profile.bio ? (
            <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{profile.bio}</p>
          ) : (
            <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">Belum ada bio singkat.</p>
          )}
        </div>
      </div>

      {/* Desktop: avatar di kartu, overlap cover */}
      <div className="relative z-20 hidden px-5 lg:block">
        <div className="-mt-10">
          <ProfileAvatar profile={profile} size="lg" />
        </div>
      </div>

      <div className="px-5 pb-5 lg:pt-2">
        <div className="space-y-3">
          <h1 className="text-lg font-bold leading-snug break-words text-neutral-900 dark:text-white">
            {profile.name}
          </h1>

          {(profile.account_type === 'organization' ||
            profile.is_official ||
            tier ||
            earnedBadges.length > 0) && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {tier && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  <TierBadge level={tier.level} size="sm" />
                  {tier.name}
                </span>
              )}
              {profile.is_official && <OfficialBadge className="!text-[10px]" />}
              {profile.account_type === 'organization' && (
                <Badge color="zinc" className="!text-[10px]">
                  Organisasi
                </Badge>
              )}
              {earnedBadges.map((id) => {
                const meta = BADGE_META[id]
                if (!meta) return null
                return <AchievementBadge key={id} name={meta.name} tier={meta.tier} size="sm" />
              })}
            </div>
          )}

          {reputation !== undefined && (
            <p className="text-center text-xs font-medium text-neutral-500">
              {reputation.toLocaleString('id-ID')} reputasi
              {isOwner && (
                <>
                  {' · '}
                  <Link href="/me/gamification" className="text-primary-600 hover:underline dark:text-primary-400">
                    Lihat pencapaian
                  </Link>
                </>
              )}
            </p>
          )}
          {profile.pronouns && (
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">{profile.pronouns}</p>
          )}
        </div>

        {hasStatus && (
          <div
            className="mt-3 rounded-lg px-3 py-2 text-sm"
            style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
          >
            <span className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
              {profile.status_emoji && <span aria-hidden>{profile.status_emoji}</span>}
              {profile.status_text && <span>{profile.status_text}</span>}
            </span>
          </div>
        )}

        {profile.location && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-500 dark:text-neutral-400">
            <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
            {profile.location}
          </p>
        )}

        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-500 dark:text-neutral-400">
          <CalendarDaysIcon className="size-3.5 shrink-0" aria-hidden />
          Bergabung {memberSince(profile.created_at)}
        </p>

        {(followersCount !== undefined || followingCount !== undefined) && (
          <div className="mt-3 flex justify-center gap-4 text-sm">
            {followersCount !== undefined && (
              <button
                type="button"
                onClick={() => setFollowDialog('followers')}
                className="hover:underline"
                style={{ color: 'var(--psd-accent)' }}
              >
                <span className="font-semibold text-neutral-900 dark:text-white">{followersCount}</span>{' '}
                <span className="text-neutral-500">pengikut</span>
              </button>
            )}
            {followingCount !== undefined && (
              <button
                type="button"
                onClick={() => setFollowDialog('following')}
                className="hover:underline"
                style={{ color: 'var(--psd-accent)' }}
              >
                <span className="font-semibold text-neutral-900 dark:text-white">{followingCount}</span>{' '}
                <span className="text-neutral-500">mengikuti</span>
              </button>
            )}
          </div>
        )}

        {profile.interests.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Minat</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{
                    background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                    color: accent,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile.links.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Tautan</p>
            <ul className="space-y-1.5">
              {profile.links.map((link) => (
                <li key={`${link.label}-${link.url}`}>
                  <Link
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary-600 hover:underline dark:text-primary-400"
                  >
                    <LinkIcon className="size-3.5 shrink-0" aria-hidden />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {profile.about_md ? (
          <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Tentang</p>
            <SimpleMarkdown content={profile.about_md} />
          </div>
        ) : (
          isOwner && (
            <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
              <p className="text-sm text-neutral-400 dark:text-neutral-500">
                Ceritakan tentang dirimu di pengaturan profil.
              </p>
            </div>
          )
        )}
      </div>

      {followDialog && (
        <FollowListDialog
          username={profile.username}
          mode={followDialog}
          open={!!followDialog}
          onClose={() => setFollowDialog(null)}
        />
      )}
    </aside>
  )
}

function PreviewCard({
  profile,
  isOwner,
  className,
  accent,
  hasStatus,
  stats,
}: {
  profile: Profile | UserProfile
  isOwner?: boolean
  className?: string
  accent: string
  hasStatus: boolean | string | null | undefined
  stats?: UserProfile['stats']
}) {
  return (
    <div
      className={clsx(
        'profile overflow-hidden rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-900',
        className
      )}
      style={{ ['--psd-accent' as string]: accent }}
    >
      <ProfileCover profile={profile} className="h-20" />

      <div className="relative px-4 pb-4">
        <div className="-mt-8 mb-2">
          <ProfileAvatar profile={profile} size="sm" />
        </div>

        <h2 className="text-base font-bold">{profile.name}</h2>
        <p className="font-mono text-xs text-neutral-500">@{profile.username}</p>

        {hasStatus && (
          <span
            className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
            style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)` }}
          >
            {profile.status_emoji} {profile.status_text}
          </span>
        )}

        {profile.bio && (
          <p className="mt-2 line-clamp-3 text-sm text-neutral-600 dark:text-neutral-400">{profile.bio}</p>
        )}

        {stats && (
          <p className="mt-2 text-xs text-neutral-500">
            {stats.projects} proyek · {stats.datasets} dataset · {stats.models} model
          </p>
        )}

        {isOwner && <p className="mt-3 text-xs text-neutral-400">Pratinjau profil publik</p>}
      </div>
    </div>
  )
}
