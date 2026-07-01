'use client'

import { listFeaturedOrgOpportunities, listOrgs, myOrgs } from '@/lib/api/orgs'
import { ORG_TYPES, orgTypeLabel } from '@/lib/orgs/org-utils'
import { MY_ORGS_QUERY_KEY } from '@/components/features/orgs/MyOrgsPage'
import { useAuth } from '@/lib/auth/useAuth'
import { timeAgo } from '@/lib/utils/format'
import type { MyOrg } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  BriefcaseIcon,
  BuildingOffice2Icon,
  CheckBadgeIcon,
  FireIcon,
  PlusIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

type Props = {
  activeType?: string | null
  onTypeClick?: (type: string | null) => void
  className?: string
}

function StatTile({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-800/60">
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">{icon}</div>
      <p className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  )
}

export function OrgsSidebar({ activeType, onTypeClick, className }: Props) {
  const { isLoggedIn } = useAuth()

  const allOrgs = useQuery({
    queryKey: ['orgs', 'browse-stats'],
    queryFn: () => listOrgs({ page_size: 100 }),
    staleTime: 60_000,
  })

  const mine = useQuery({
    queryKey: MY_ORGS_QUERY_KEY,
    queryFn: async () => (await myOrgs()).items as MyOrg[],
    enabled: isLoggedIn,
    staleTime: 60_000,
  })

  const opportunities = useQuery({
    queryKey: ['orgs', 'featured-opportunities'],
    queryFn: async () => (await listFeaturedOrgOpportunities()).items,
    staleTime: 60_000,
  })

  const items = allOrgs.data?.items ?? []
  const verified = items.filter((o) => o.verification === 'verified')
  const business = items.filter((o) => o.type === 'umkm' || o.type === 'enterprise')

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Organisasi"
          value={allOrgs.isLoading ? '—' : (allOrgs.data?.total ?? items.length)}
          icon={<BuildingOffice2Icon className="size-4" />}
        />
        <StatTile
          label="Terverifikasi"
          value={allOrgs.isLoading ? '—' : verified.length}
          icon={<CheckBadgeIcon className="size-4" />}
        />
        <StatTile
          label="UMKM & bisnis"
          value={allOrgs.isLoading ? '—' : business.length}
          icon={<SparklesIcon className="size-4" />}
        />
      </div>

      {isLoggedIn ? (
        <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-teal-50/50 p-4 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-neutral-900">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Kelola organisasi</p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            Buat profil organisasi atau kelola yang sudah Anda ikuti.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonPrimary href="/orgs/new" className="!text-xs">
              <PlusIcon className="size-4" aria-hidden />
              Buat organisasi
            </ButtonPrimary>
            <Link
              href="/me/orgs"
              className="inline-flex items-center rounded-full border border-emerald-300/80 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-white/60 dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
            >
              Organisasi saya
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-emerald-300/80 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Gabung ekosistem PSD</p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            Masuk untuk membuat organisasi, mengikuti UMKM, atau melamar peluang kolaborasi.
          </p>
          <Link href="/login?next=/orgs" className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300">
            Masuk untuk mulai
          </Link>
        </div>
      )}

      {isLoggedIn && (mine.data?.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <UserGroupIcon className="size-4 text-emerald-500" />
            Organisasi saya
          </h3>
          <ul className="mt-3 space-y-2">
            {(mine.data ?? []).slice(0, 4).map((org) => (
              <li key={org.id}>
                <Link
                  href={`/orgs/${org.handle}`}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                    <BuildingOffice2Icon className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">{org.name}</p>
                    <p className="truncate text-xs text-neutral-500">@{org.handle}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {(mine.data?.length ?? 0) > 4 && (
            <Link href="/me/orgs" className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300">
              Lihat semua →
            </Link>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <FireIcon className="size-4 text-orange-500" />
          Filter tipe
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onTypeClick?.(null)}
            className={clsx(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              !activeType
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-neutral-700 dark:text-neutral-300',
            )}
          >
            Semua
          </button>
          {ORG_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTypeClick?.(activeType === t ? null : t)}
              className={clsx(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                activeType === t
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-neutral-700 dark:text-neutral-300',
              )}
            >
              {orgTypeLabel[t]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <CheckBadgeIcon className="size-4 text-sky-500" />
          Terverifikasi
        </h3>
        <ul className="mt-3 space-y-2">
          {verified.length === 0 && (
            <p className="text-xs text-neutral-500">Belum ada organisasi terverifikasi.</p>
          )}
          {verified.slice(0, 5).map((org) => (
            <li key={org.id}>
              <Link
                href={`/orgs/${org.handle}`}
                className="block rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
              >
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{org.name}</span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {orgTypeLabel[org.type]} · @{org.handle}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {(opportunities.data?.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <BriefcaseIcon className="size-4 text-violet-500" />
            Peluang terbaru
          </h3>
          <ul className="mt-3 space-y-3">
            {opportunities.data!.map((op) => (
              <li key={op.id} className="rounded-xl border border-neutral-100 p-2.5 dark:border-neutral-700">
                <Link
                  href={`/orgs/${op.org_handle}`}
                  className="block rounded-lg motion-safe:transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/40"
                >
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{op.title}</p>
                  <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">{op.org_name}</p>
                  <p className="mt-1 text-xs text-neutral-500">{timeAgo(op.created_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-800/60">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Kolaborasi tim?</p>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Organisasi bisa membentuk tim kolaborasi untuk proyek dan aset bersama.
        </p>
        <Link href="/teams" className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300">
          Jelajahi tim →
        </Link>
      </section>
    </aside>
  )
}
