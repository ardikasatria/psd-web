'use client'

import { myOrgs } from '@/lib/api/orgs'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { MyOrg } from '@/types/api'
import { OrgCard } from '@/components/features/orgs/OrgCard'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useQuery } from '@tanstack/react-query'

export const MY_ORGS_QUERY_KEY = ['my-orgs'] as const

export function MyOrgsPage() {
  useAuthGuard('/me/orgs')
  const orgsQuery = useQuery({
    queryKey: MY_ORGS_QUERY_KEY,
    queryFn: async () => {
      const res = await myOrgs()
      return res.items as MyOrg[]
    },
  })

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title="Organisasi saya"
        subtitle="Kelola organisasi yang Anda buat atau ikuti. Satu akun bisa tergabung di banyak organisasi."
        actions={
          <ButtonPrimary href="/orgs/new">Buat organisasi</ButtonPrimary>
        }
      />
      <QueryState
        isLoading={orgsQuery.isLoading}
        isError={orgsQuery.isError}
        error={orgsQuery.error}
        isEmpty={!orgsQuery.data?.length}
        emptyTitle="Belum ada organisasi"
        emptyDescription="Buat organisasi pertama Anda atau terima undangan dari organisasi lain."
        emptyAction={{ label: 'Buat organisasi', href: '/orgs/new' }}
        skeletonColumns={2}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(orgsQuery.data ?? []).map((org: MyOrg, i: number) => (
            <OrgCard key={org.id} org={org} index={i} />
          ))}
        </div>
      </QueryState>
    </FeaturePageShell>
  )
}
