import BackgroundSection from '@/components/BackgroundSection'
import { Heading, Subheading } from '@/shared/Heading'
import clsx from 'clsx'
import { ReactNode } from 'react'
import { SeeAllLink } from './SeeAllLink'

interface FeatureSectionProps {
  title: string
  subtitle?: string
  dimHeading?: string
  seeAllHref?: string
  seeAllLabel?: string
  withBackground?: boolean
  isCenter?: boolean
  children: ReactNode
  className?: string
}

export function FeatureSection({
  title,
  subtitle,
  dimHeading,
  seeAllHref,
  seeAllLabel,
  withBackground = false,
  isCenter = false,
  children,
  className,
}: FeatureSectionProps) {
  return (
    <section
      className={clsx(
        'relative',
        withBackground && 'mt-6 py-12 lg:mt-10 lg:py-16',
        className
      )}
    >
      {withBackground && <BackgroundSection />}
      <div className="relative z-10">
        <header
          className={clsx(
            'mb-8 sm:mb-10',
            isCenter && 'text-center'
          )}
        >
          <div
            className={clsx(
              'flex flex-wrap items-center gap-3 sm:gap-4',
              isCenter && 'justify-center'
            )}
          >
            <Heading level={2} dimHeading={dimHeading} className="!text-2xl sm:!text-3xl lg:!text-4xl">
              {title}
            </Heading>
            {seeAllHref && <SeeAllLink href={seeAllHref} label={seeAllLabel} />}
          </div>
          {subtitle && (
            <Subheading className={clsx('mt-3 max-w-3xl', isCenter && 'mx-auto')}>
              {subtitle}
            </Subheading>
          )}
        </header>
        {children}
      </div>
    </section>
  )
}
