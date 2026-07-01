'use client'

import { OrgCard } from '@/components/features/orgs/OrgCard'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import { listOrgs } from '@/lib/api/orgs'
import { orgTypeLabel } from '@/lib/orgs/org-utils'
import { MyOrg } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Select from '@/shared/Select'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

export function BrowseOrgsPage() {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')

  const orgsQuery = useQuery({
    queryKey: ['orgs', 'browse', q, type],
    queryFn: () => listOrgs({ q: q || undefined, type: type || undefined }),
  })

  const items = (orgsQuery.data?.items ?? []) as MyOrg[]

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title="Organisasi"
        subtitle="Jelajahi organisasi UMKM, akademik, komunitas, dan enterprise di platform PSD."
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonPrimary href="/me/orgs" outline>
              Organisasi saya
            </ButtonPrimary>
            <ButtonPrimary href="/orgs/new">Buat organisasi</ButtonPrimary>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari organisasi…"
          className="min-w-[200px] flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
        />
        <Select value={type} onChange={(e) => setType(e.target.value)} className="!rounded-xl">
          <option value="">Semua tipe</option>
          {Object.entries(orgTypeLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      <QueryState
        isLoading={orgsQuery.isLoading}
        isError={orgsQuery.isError}
        error={orgsQuery.error}
        isEmpty={!items.length}
        emptyTitle="Tidak ada organisasi"
        emptyDescription="Coba ubah filter pencarian."
        skeletonColumns={3}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((org, i) => (
            <OrgCard key={org.id} org={org} index={i} />
          ))}
        </div>
      </QueryState>
    </FeaturePageShell>
  )
}
