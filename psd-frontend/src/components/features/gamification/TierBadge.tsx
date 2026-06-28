import clsx from 'clsx'
import Image from 'next/image'
import { TIER_BADGE_FILES, TIER_LABELS, tierLabel } from '@/lib/gamification/config'

export { tierLabel }

export function TierBadge({
  level,
  size = 'md',
  className,
  title,
}: {
  level: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  title?: string
}) {
  const idx = Math.min(Math.max(level, 0), TIER_BADGE_FILES.length - 1)
  const sizes = { sm: 40, md: 56, lg: 80 }[size]

  return (
    <span
      className={clsx('inline-flex shrink-0 items-center justify-center', className)}
      title={title ?? tierLabel(idx)}
    >
      <Image
        src={`/badges/${TIER_BADGE_FILES[idx]}`}
        alt={tierLabel(idx)}
        width={sizes}
        height={sizes}
        className="drop-shadow-sm motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:scale-105"
        style={{ background: 'transparent' }}
      />
    </span>
  )
}

// Backward compat for code importing TIER_NAMES
export const TIER_NAMES = TIER_LABELS
