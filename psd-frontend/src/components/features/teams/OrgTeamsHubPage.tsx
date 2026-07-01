'use client'

import { CreateTeamDialog } from '@/components/features/teams/CreateTeamDialog'
import { TeamCard } from '@/components/features/teams/TeamCard'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { listTeams } from '@/lib/api/teams'
import { useOrgGuard } from '@/lib/auth/useOrgGuard'
import { fetchMyTeams, MY_TEAMS_QUERY_KEY } from '@/lib/teams/myTeamsQuery'
import { roleLabel } from '@/lib/teams/permissions'
import { teamCardMuted, teamText, teamTextMuted } from '@/lib/teams/team-ui'
import { MyTeam, TeamSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import {
  BuildingOffice2Icon,
  ChartBarIcon,
  PlusIcon,
  TrophyIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useMemo, useState } from 'react'

export function OrgTeamsHubPage() {
  const { user, isLoading: guardLoading, isOrg } = useOrgGuard()
  const [createOpen, setCreateOpen] = useState(false)

  const myTeamsQuery = useQuery({
    queryKey: MY_TEAMS_QUERY_KEY,
    queryFn: fetchMyTeams,
    enabled: isOrg,
  })

  const publicQuery = useQuery({
    queryKey: ['teams', 'org-hub'],
    queryFn: () => listTeams('', 1),
    enabled: isOrg,
    staleTime: 60_000,
  })

  const ownedTeams = useMemo(
    () => (myTeamsQuery.data ?? []).filter((t: MyTeam) => t.role === 'owner'),
    [myTeamsQuery.data],
  )

  const allMyTeams = myTeamsQuery.data ?? []
  const totalMembers = allMyTeams.length
  const compTeams = (publicQuery.data?.items ?? []).filter((t) => (t.competitions_count ?? 0) > 0)

  if (guardLoading || !isOrg || !user) {
    return (
      <FeaturePageShell>
        <p className={teamTextMuted}>Memuat…</p>
      </FeaturePageShell>
    )
  }

  return (
    <FeaturePageShell>
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-sky-50/60 p-6 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-neutral-900 dark:to-neutral-900 sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <BuildingOffice2Icon className="size-3.5" aria-hidden />
              Hub Organisasi
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {user.name}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              Kelola tim kolaborasi organisasi Anda — undang anggota, kurasi aset bersama, dan bangun
              reputasi di kompetisi PSD.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonPrimary href="/me/orgs" outline>
              Kelola organisasi
            </ButtonPrimary>
            <ButtonPrimary type="button" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-4" aria-hidden />
              Buat tim organisasi
            </ButtonPrimary>
          </div>
        </div>
        <div
          className="pointer-events-none absolute -end-12 -top-12 size-48 rounded-full bg-emerald-400/10 blur-3xl"
          aria-hidden
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className={`${teamCardMuted} p-5`}>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <UserGroupIcon className="size-5" aria-hidden />
            <span className="text-sm font-medium">Tim Anda</span>
          </div>
          <p className={`mt-2 text-3xl font-bold ${teamText}`}>{allMyTeams.length}</p>
          <p className={`text-xs ${teamTextMuted}`}>{ownedTeams.length} sebagai owner</p>
        </div>
        <div className={`${teamCardMuted} p-5`}>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
            <ChartBarIcon className="size-5" aria-hidden />
            <span className="text-sm font-medium">Keanggotaan aktif</span>
          </div>
          <p className={`mt-2 text-3xl font-bold ${teamText}`}>{totalMembers}</p>
          <p className={`text-xs ${teamTextMuted}`}>Tim yang Anda ikuti</p>
        </div>
        <div className={`${teamCardMuted} p-5`}>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <TrophyIcon className="size-5" aria-hidden />
            <span className="text-sm font-medium">Tim berkompetisi</span>
          </div>
          <p className={`mt-2 text-3xl font-bold ${teamText}`}>{compTeams.length}</p>
          <p className={`text-xs ${teamTextMuted}`}>Di direktori publik</p>
        </div>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className={`text-lg font-semibold ${teamText}`}>Tim yang Anda kelola</h2>
          <Link href="/me/teams" className="text-sm font-medium text-primary-600 dark:text-primary-400">
            Semua tim saya →
          </Link>
        </div>
        <QueryState
          isLoading={myTeamsQuery.isLoading}
          isError={myTeamsQuery.isError}
          error={myTeamsQuery.error}
          isEmpty={!ownedTeams.length}
          emptyTitle="Belum ada tim organisasi"
          emptyDescription="Buat tim pertama untuk mengundang anggota dan memulai kolaborasi."
          emptyAction={{ label: 'Buat tim', href: '/teams' }}
          skeletonColumns={2}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ownedTeams.map((t: MyTeam, i) => (
              <div key={t.slug} className="relative">
                <TeamCard team={{ slug: t.slug, name: t.name, avatar_url: t.avatar_url } as TeamSummary} index={i} />
                <div className="absolute end-3 top-3">
                  <Badge color="emerald">{roleLabel[t.role] ?? t.role}</Badge>
                </div>
              </div>
            ))}
          </div>
        </QueryState>
      </section>

      <section className={`mt-10 ${teamCardMuted} p-6`}>
        <h3 className={`text-sm font-semibold ${teamText}`}>Panduan organisasi & UMKM</h3>
        <ol className={`mt-4 space-y-3 text-sm ${teamTextMuted}`}>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              1
            </span>
            Buat tim dengan fokus UMKM atau domain organisasi Anda
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
              2
            </span>
            Undang anggota dan tetapkan co-owner untuk moderasi
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              3
            </span>
            Kumpulkan aset (dataset, model, notebook) di bawah tim
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              4
            </span>
            Submit kompetisi sebagai tim untuk meningkatkan visibilitas
          </li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonPrimary href="/teams" outline>
            Jelajahi direktori tim
          </ButtonPrimary>
          <ButtonPrimary href="/competitions" outline>
            Kompetisi aktif
          </ButtonPrimary>
        </div>
      </section>

      <CreateTeamDialog open={createOpen} onClose={() => setCreateOpen(false)} defaultFocus="UMKM" />
    </FeaturePageShell>
  )
}
