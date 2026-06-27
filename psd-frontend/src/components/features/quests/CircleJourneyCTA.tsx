'use client'

import { getJourney } from '@/lib/api/quests'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline'

export type CircleCTAVariant = 'default' | 'course-complete' | 'submission-scored' | 'asset-published'

const PRESET: Record<Exclude<CircleCTAVariant, 'default'>, { title: string; description: string; cta_link: string; cta: string }> = {
  'course-complete': {
    title: 'Langkah berikutnya: buktikan di kompetisi',
    description: 'Course selesai — saatnya menguji kemampuan dengan submission yang dinilai di kompetisi PSD.',
    cta_link: '/competitions',
    cta: 'Jelajahi kompetisi',
  },
  'submission-scored': {
    title: 'Bangun portofolio dari eksperimenmu',
    description: 'Submission sudah dinilai. Terbitkan dataset atau model dari hasil kerjamu agar portofolio semakin kuat.',
    cta_link: '/datasets/new',
    cta: 'Terbitkan aset',
  },
  'asset-published': {
    title: 'Tantang dirimu di kompetisi',
    description: 'Aset sudah terbit — bagikan ke feed atau ikuti kompetisi untuk memperluas dampak karyamu.',
    cta_link: '/competitions',
    cta: 'Ikuti kompetisi',
  },
}

type Props = {
  variant?: CircleCTAVariant
  className?: string
}

export function CircleJourneyCTA({ variant = 'default', className }: Props) {
  const journey = useQuery({
    queryKey: ['me', 'journey'],
    queryFn: getJourney,
    enabled: variant === 'default',
  })

  const preset = variant !== 'default' ? PRESET[variant] : null
  const next = preset ?? journey.data?.next
  const ctaLabel = preset?.cta ?? 'Lanjutkan'

  if (variant === 'default' && journey.isLoading) {
    return <div className={clsx('h-28 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800', className)} />
  }

  if (!next) return null

  return (
    <section
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-primary-200/70 bg-gradient-to-r from-primary-50 to-white p-5 dark:border-primary-800/50 dark:from-primary-950/30 dark:to-neutral-900',
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
            <SparklesIcon className="size-3.5" />
            Lingkaran PSD
          </p>
          <h3 className="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">{next.title}</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{next.description}</p>
        </div>
        <ButtonPrimary href={next.cta_link} className="group shrink-0">
          {ctaLabel}
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" data-slot="icon" />
        </ButtonPrimary>
      </div>
    </section>
  )
}
