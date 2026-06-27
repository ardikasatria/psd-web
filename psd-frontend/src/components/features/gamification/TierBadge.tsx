import clsx from 'clsx'
import Image from 'next/image'

const TIER_FILES = [
  'Badges-psd-01-pemula.svg',
  'Badges-psd-02-kontributor.svg',
  'Badges-psd-03-ahli.svg',
  'Badges-psd-04-master.svg',
  'Badges-psd-05-grandmaster.svg',
] as const

const TIER_NAMES = ['Pemula', 'Kontributor', 'Ahli', 'Master', 'Grandmaster'] as const

export function tierLabel(level: number) {
  return TIER_NAMES[Math.min(Math.max(level, 0), TIER_NAMES.length - 1)]
}

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
  const idx = Math.min(Math.max(level, 0), TIER_FILES.length - 1)
  const sizes = { sm: 40, md: 56, lg: 80 }[size]

  return (
    <span
      className={clsx('inline-flex shrink-0 items-center justify-center', className)}
      title={title ?? tierLabel(idx)}
    >
      <Image
        src={`/badges/${TIER_FILES[idx]}`}
        alt={tierLabel(idx)}
        width={sizes}
        height={sizes}
        className="drop-shadow-sm motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:scale-105"
        style={{ background: 'transparent' }}
      />
    </span>
  )
}
