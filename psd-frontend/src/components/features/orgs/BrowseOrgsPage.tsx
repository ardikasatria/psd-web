'use client'

import { OrgCard } from '@/components/features/orgs/OrgCard'
import { OrgsSidebar } from '@/components/features/orgs/OrgsSidebar'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageHero, FeaturePageShell, SearchField } from '@/components/features/layout'
import { listOrgs } from '@/lib/api/orgs'
import { orgTypeLabel } from '@/lib/orgs/org-utils'
import { useAuth } from '@/lib/auth/useAuth'
import { MyOrg } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { BuildingOffice2Icon, PlusIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

export function BrowseOrgsPage() {
  const { isLoggedIn } = useAuth()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')

  const orgsQuery = useQuery({
    queryKey: ['orgs', 'browse', q, type],
    queryFn: () => listOrgs({ q: q || undefined, type: type || undefined }),
  })

  const items = (orgsQuery.data?.items ?? []) as MyOrg[]

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          <FeaturePageHero
            title="Organisasi"
            subtitle="Jelajahi organisasi UMKM, akademik, komunitas, dan enterprise di platform PSD."
            variant="compact"
            actions={
              isLoggedIn ? (
                <ButtonPrimary href="/orgs/new" className="!bg-white/15 !text-white hover:!bg-white/25">
                  <PlusIcon className="mr-1.5 inline size-4" aria-hidden />
                  Buat organisasi
                </ButtonPrimary>
              ) : (
                <ButtonPrimary href="/login?next=/orgs" className="!bg-white/15 !text-white hover:!bg-white/25">
                  <BuildingOffice2Icon className="mr-1.5 inline size-4" aria-hidden />
                  Masuk untuk bergabung
                </ButtonPrimary>
              )
            }
          />

          <div className="rounded-3xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:p-5">
            <SearchField
              value={q}
              onChange={setQ}
              placeholder="Cari organisasi…"
              aria-label="Cari organisasi"
              className="w-full max-w-none"
            />
            {type && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-neutral-500">Filter:</span>
                <button
                  type="button"
                  onClick={() => setType('')}
                  className="rounded-full bg-emerald-100 px-3 py-0.5 font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                >
                  {orgTypeLabel[type as keyof typeof orgTypeLabel] ?? type} ×
                </button>
              </div>
            )}
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              {orgsQuery.isLoading
                ? 'Memuat…'
                : `Menampilkan ${items.length} dari ${orgsQuery.data?.total ?? items.length} organisasi`}
            </p>
          </div>

          <QueryState
            isLoading={orgsQuery.isLoading}
            isError={orgsQuery.isError}
            error={orgsQuery.error}
            isEmpty={!items.length}
            emptyTitle="Tidak ada organisasi"
            emptyDescription="Coba ubah kata kunci atau filter tipe di sidebar."
            skeletonColumns={2}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((org, i) => (
                <OrgCard key={org.id} org={org} index={i} />
              ))}
            </div>
          </QueryState>

          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Sudah punya organisasi? Kelola di{' '}
            <Link href="/me/orgs" className="font-medium text-emerald-700 hover:underline dark:text-emerald-300">
              Organisasi saya
            </Link>
            {' '}atau diskusikan di{' '}
            <Link href="/forum" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Forum PSD
            </Link>
            .
          </p>
        </div>

        <OrgsSidebar
          className="w-full shrink-0 lg:sticky lg:top-24 lg:w-80"
          activeType={type || null}
          onTypeClick={(t) => setType(t ?? '')}
        />
      </div>
    </FeaturePageShell>
  )
}
