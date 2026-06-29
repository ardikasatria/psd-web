'use client'

import { PeoplePanel } from '@/components/features/community/PeoplePanel'
import { getDiscoveryPanels } from '@/lib/api/discovery'
import type { DiscoveryPanels } from '@/types/api'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'

function affiliationTitle(items: DiscoveryPanels['affiliation']) {
  if (!items.length) return 'Orang serupa'
  const reason = items[0].reason
  if (reason.startsWith('Sesama ')) {
    return `Dari ${reason.slice(7)}`
  }
  return reason
}

function PanelSkeleton() {
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

export function CommunityDiscoveryPanels({ className }: { className?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['discovery', 'panels'],
    queryFn: () => getDiscoveryPanels(8),
    staleTime: 60_000,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className={clsx('space-y-4', className)}>
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
    )
  }

  if (!data) return null

  const panels: { key: keyof DiscoveryPanels; title: string; kind: 'similar' | 'top-tier' | 'popular' | 'achievements' | 'new' }[] = []

  if (data.affiliation.length > 0) {
    panels.push({ key: 'affiliation', title: affiliationTitle(data.affiliation), kind: 'similar' })
  }
  if (data.top_tier.length > 0) {
    panels.push({ key: 'top_tier', title: 'Tier teratas', kind: 'top-tier' })
  }
  if (data.popular.length > 0) {
    panels.push({ key: 'popular', title: 'Populer', kind: 'popular' })
  }
  if (data.achievements.length > 0) {
    panels.push({ key: 'achievements', title: 'Pencapaian terbaru', kind: 'achievements' })
  }
  if (data.new_members.length > 0) {
    panels.push({ key: 'new_members', title: 'Anggota baru', kind: 'new' })
  }

  if (panels.length === 0) return null

  return (
    <div className={clsx('space-y-4', className)}>
      {panels.map(({ key, title, kind }) => (
        <PeoplePanel key={key} title={title} kind={kind} items={data[key]} />
      ))}
    </div>
  )
}
