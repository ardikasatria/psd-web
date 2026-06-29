'use client'

import { PeoplePanel } from '@/components/features/community/PeoplePanel'
import { getDiscoveryPanels } from '@/lib/api/discovery'
import type { DiscoveryPanels } from '@/types/api'
import { FireIcon, TrophyIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import type { ReactNode } from 'react'

export type DiscoveryPanelKey = keyof DiscoveryPanels

type PanelConfig = {
  key: DiscoveryPanelKey
  title: string
  kind: 'similar' | 'top-tier' | 'popular' | 'achievements' | 'new'
  icon?: ReactNode
}

function affiliationTitle(items: DiscoveryPanels['affiliation']) {
  if (!items.length) return 'Orang serupa'
  const reason = items[0].reason
  if (reason.startsWith('Sesama ')) {
    return `Dari ${reason.slice(7)}`
  }
  return reason
}

function PanelSkeleton({ featured }: { featured?: boolean }) {
  if (featured) {
    return (
      <div className="animate-pulse rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50/90 via-white to-sky-50/40 p-5 dark:border-primary-800/40 dark:from-primary-950/25 dark:via-neutral-900 dark:to-neutral-900">
        <div className="mb-4 h-5 w-48 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-white/70 dark:bg-neutral-800/60" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-pulse rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
      <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700" />
      <div className="mt-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="size-9 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-2 w-32 rounded bg-neutral-100 dark:bg-neutral-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildPanelConfigs(data: DiscoveryPanels): PanelConfig[] {
  const panels: PanelConfig[] = []

  if (data.affiliation.length > 0) {
    panels.push({ key: 'affiliation', title: affiliationTitle(data.affiliation), kind: 'similar' })
  }
  if (data.top_tier.length > 0) {
    panels.push({
      key: 'top_tier',
      title: 'Tier teratas',
      kind: 'top-tier',
      icon: <TrophyIcon className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />,
    })
  }
  if (data.popular.length > 0) {
    panels.push({
      key: 'popular',
      title: 'Populer',
      kind: 'popular',
      icon: <FireIcon className="size-4 text-orange-600 dark:text-orange-400" aria-hidden />,
    })
  }
  if (data.achievements.length > 0) {
    panels.push({ key: 'achievements', title: 'Pencapaian terbaru', kind: 'achievements' })
  }
  if (data.new_members.length > 0) {
    panels.push({ key: 'new_members', title: 'Anggota baru', kind: 'new' })
  }

  return panels
}

type Props = {
  className?: string
  /** Hanya tampilkan panel tertentu */
  only?: DiscoveryPanelKey[]
  /** Sembunyikan panel tertentu */
  exclude?: DiscoveryPanelKey[]
  /** `featured` = strip horizontal di konten utama; `sidebar` = stack vertikal */
  layout?: 'sidebar' | 'featured'
}

export function CommunityDiscoveryPanels({
  className,
  only,
  exclude,
  layout = 'sidebar',
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['discovery', 'panels'],
    queryFn: () => getDiscoveryPanels(8),
    staleTime: 60_000,
    retry: false,
  })

  const featured = layout === 'featured'

  if (isLoading) {
    return <PanelSkeleton featured={featured} />
  }

  if (!data) return null

  let panels = buildPanelConfigs(data)

  if (only?.length) {
    panels = panels.filter((p) => only.includes(p.key))
  }
  if (exclude?.length) {
    panels = panels.filter((p) => !exclude.includes(p.key))
  }

  if (panels.length === 0) return null

  if (featured) {
    return (
      <section
        className={clsx(
          'rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50/90 via-white to-sky-50/40 p-5 sm:p-6 dark:border-primary-800/40 dark:from-primary-950/25 dark:via-neutral-900 dark:to-sky-950/20',
          className,
        )}
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400">
              <UserGroupIcon className="size-3.5" aria-hidden />
              Penemuan jejaring
            </p>
            <h2 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Ikuti praktisi yang relevan
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
              Kontributor tier tinggi dan akun populer di komunitas — mulai bangun feed Mengikuti Anda.
            </p>
          </div>
        </div>

        <div className={clsx('grid gap-4', panels.length > 1 ? 'lg:grid-cols-2' : 'grid-cols-1')}>
          {panels.map(({ key, title, kind, icon }) => (
            <PeoplePanel
              key={key}
              title={title}
              kind={kind}
              items={data[key]}
              icon={icon}
              variant="featured"
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {panels.map(({ key, title, kind }) => (
        <PeoplePanel key={key} title={title} kind={kind} items={data[key]} variant="sidebar" />
      ))}
    </div>
  )
}
