import clsx from 'clsx'
import { ACHIEVEMENT_BADGES } from '@/lib/gamification/config'

const TIER_STYLES = {
  bronze: {
    ring: 'from-amber-700 via-amber-500 to-amber-300',
    glow: 'shadow-amber-400/30',
    label: 'text-amber-800 dark:text-amber-300',
  },
  silver: {
    ring: 'from-slate-500 via-slate-300 to-slate-100',
    glow: 'shadow-slate-400/30',
    label: 'text-slate-700 dark:text-slate-300',
  },
  gold: {
    ring: 'from-yellow-600 via-yellow-400 to-yellow-200',
    glow: 'shadow-yellow-400/40',
    label: 'text-yellow-800 dark:text-yellow-300',
  },
} as const

function MedalIcon({ tier }: { tier: keyof typeof TIER_STYLES }) {
  const id = `medal-${tier}`
  return (
    <svg viewBox="0 0 64 64" className="size-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={tier === 'bronze' ? '#b87333' : tier === 'silver' ? '#c0c0c0' : '#ffd700'} />
          <stop offset="100%" stopColor={tier === 'bronze' ? '#8b5a2b' : tier === 'silver' ? '#808080' : '#daa520'} />
        </linearGradient>
      </defs>
      <path
        d="M20 4 L28 20 L12 20 Z M44 4 L36 20 L52 20 Z"
        fill={`url(#${id}-grad)`}
        opacity="0.9"
      />
      <circle cx="32" cy="38" r="22" fill={`url(#${id}-grad)`} />
      <circle cx="32" cy="38" r="16" fill="none" stroke="white" strokeWidth="2" opacity="0.5" />
      <path
        d="M32 28 L35 35 L42 35 L36 39 L38 46 L32 42 L26 46 L28 39 L22 35 L29 35 Z"
        fill="white"
        opacity="0.85"
      />
    </svg>
  )
}

export function AchievementBadge({
  name,
  tier,
  earned = true,
  size = 'md',
  className,
}: {
  name: string
  tier: 'bronze' | 'silver' | 'gold'
  earned?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const styles = TIER_STYLES[tier]
  const box = { sm: 'size-12', md: 'size-16', lg: 'size-20' }[size]

  return (
    <div
      className={clsx(
        'group flex flex-col items-center gap-2 text-center motion-safe:transition-transform motion-safe:duration-300',
        earned ? 'motion-safe:hover:-translate-y-0.5' : 'opacity-45 grayscale',
        className
      )}
      title={name}
    >
      <div
        className={clsx(
          box,
          'relative rounded-full bg-gradient-to-br p-0.5 shadow-lg',
          styles.ring,
          earned && styles.glow
        )}
      >
        <div className="flex size-full items-center justify-center rounded-full bg-transparent p-1.5">
          <MedalIcon tier={tier} />
        </div>
      </div>
      <span className={clsx('max-w-[5.5rem] text-xs font-medium leading-tight', styles.label)}>
        {name}
      </span>
    </div>
  )
}

export const BADGE_META: Record<
  string,
  { name: string; tier: 'bronze' | 'silver' | 'gold'; description: string }
> = Object.fromEntries(
  Object.entries(ACHIEVEMENT_BADGES).map(([id, meta]) => [id, meta]),
) as Record<string, { name: string; tier: 'bronze' | 'silver' | 'gold'; description: string }>
