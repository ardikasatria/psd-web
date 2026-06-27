import clsx from 'clsx'
import { ReactNode } from 'react'

interface FeaturePageHeroProps {
  title: string
  subtitle?: string
  dimHeading?: string
  actions?: ReactNode
  variant?: 'default' | 'compact'
  className?: string
}

export function FeaturePageHero({
  title,
  subtitle,
  dimHeading,
  actions,
  variant = 'default',
  className,
}: FeaturePageHeroProps) {
  const isCompact = variant === 'compact'

  return (
    <div
      className={clsx(
        'relative isolate overflow-hidden rounded-[32px] bg-gradient-to-br from-primary-600 via-primary-600 to-primary-400 lg:rounded-[40px]',
        isCompact ? 'px-6 py-8 lg:px-10 lg:py-10' : 'px-8 py-12 lg:px-14 lg:py-16',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
        <div className="absolute -end-12 -top-12 size-56 rounded-full bg-white/10 blur-3xl lg:-end-16 lg:-top-16 lg:size-72" />
        <div className="absolute -bottom-16 start-0 size-48 rounded-full bg-primary-300/25 blur-3xl lg:-bottom-20 lg:size-64" />
        <div className="absolute end-1/4 top-1/2 size-32 rounded-full bg-white/5 blur-2xl" />
      </div>

      <div className="relative z-10 max-w-3xl">
        <h1
          className={clsx(
            'font-semibold tracking-tight text-pretty text-white',
            isCompact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl lg:text-5xl'
          )}
        >
          {title}
          {dimHeading && (
            <>
              {'. '}
              <span className="text-white/60">{dimHeading}</span>
            </>
          )}
        </h1>
        {subtitle && (
          <p
            className={clsx(
              'mt-3.5 max-w-2xl text-pretty text-white/85',
              isCompact ? 'text-base lg:text-lg' : 'text-lg lg:text-xl'
            )}
          >
            {subtitle}
          </p>
        )}
        {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  )
}
