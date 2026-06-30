'use client'

import { sidebarGradientBr } from '@/components/common/featureGradients'
import { SidebarStatTile, sidebarSectionClass, sidebarTipClass } from '@/components/common/SidebarStatTile'
import { getCompetitionStats } from '@/lib/api/competitions'
import { listTeams } from '@/lib/api/teams'
import { useAuth } from '@/lib/auth/useAuth'
import { fetchMyTeams, MY_TEAMS_QUERY_KEY } from '@/lib/teams/myTeamsQuery'
import type { MyTeam } from '@/types/api'
import {
  ArrowRightIcon,
  BoltIcon,
  ChartBarIcon,
  FireIcon,
  PlusIcon,
  SparklesIcon,
  TrophyIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

const TEAM_TIPS = [
  'Tim kompetisi kuat punya ritme: rotasi lead notebook, review submission, dan debrief setelah deadline.',
  'Publikasikan aset tim di portofolio — reputasi kolektif membuka pintu undangan kompetisi berikutnya.',
  'Gabungkan keahlian: satu anggota framing data, satu modeling, satu storytelling hasil.',
  'Tim kecil (3–5) sering lebih gesit di kompetisi sprint — fokus dan koordinasi mengalahkan jumlah anggota.',
]

type Props = {
  className?: string
  onCreateClick?: () => void
}

function MyTeamMini({ team }: { team: MyTeam }) {
  return (
    <Link
      href={`/teams/${team.slug}`}
      className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white p-2.5 transition hover:border-primary-200 dark:border-neutral-700 dark:bg-neutral-800/90 dark:hover:border-neutral-600"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-indigo-500 text-white">
        <UserGroupIcon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{team.name}</p>
        <p className="text-xs capitalize text-neutral-500">{team.role}</p>
      </div>
    </Link>
  )
}

export function TeamsSidebar({ className, onCreateClick }: Props) {
  const { isLoggedIn } = useAuth()
  const tip = TEAM_TIPS[new Date().getDate() % TEAM_TIPS.length]

  const teams = useQuery({
    queryKey: ['teams', 'sidebar'],
    queryFn: () => listTeams('', 1),
    staleTime: 60_000,
  })
  const myTeams = useQuery({
    queryKey: MY_TEAMS_QUERY_KEY,
    queryFn: fetchMyTeams,
    enabled: isLoggedIn,
    staleTime: 60_000,
  })
  const compStats = useQuery({
    queryKey: ['competition-stats'],
    queryFn: getCompetitionStats,
    staleTime: 60_000,
  })

  const items = teams.data?.items ?? []
  const totalMembers = items.reduce((s, t) => s + (t.member_count ?? 0), 0)
  const compTeams = items.filter((t) => (t.competitions_count ?? 0) > 0)
  const topComp = [...items].sort((a, b) => (b.competitions_count ?? 0) - (a.competitions_count ?? 0))[0]
  const myItems = myTeams.data ?? []

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-2 gap-2">
        <SidebarStatTile label="Tim publik" value={items.length} icon={<UserGroupIcon className="size-4" />} />
        <SidebarStatTile label="Kolaborator" value={totalMembers} icon={<BoltIcon className="size-4" />} accent="sky" />
        <SidebarStatTile label="Aktif kompetisi" value={compStats.data?.active ?? '—'} icon={<TrophyIcon className="size-4" />} accent="amber" />
        <SidebarStatTile label="Tim berkompetisi" value={compTeams.length} icon={<FireIcon className="size-4" />} accent="indigo" />
      </div>

      {topComp && (topComp.competitions_count ?? 0) > 0 && (
        <section className={sidebarGradientBr.team}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            <TrophyIcon className="size-3.5" aria-hidden />
            Aura kompetisi
          </div>
          <Link href={`/teams/${topComp.slug}`} className="mt-2 block font-semibold text-neutral-900 hover:text-primary-600 dark:text-neutral-100">
            {topComp.name}
          </Link>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            {topComp.competitions_count} kompetisi · {topComp.assets_count ?? 0} aset tim
          </p>
          <Link href="/competitions" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
            Lihat kompetisi aktif
            <ArrowRightIcon className="size-3.5" aria-hidden />
          </Link>
        </section>
      )}

      {isLoggedIn && myItems.length > 0 && (
        <section className={sidebarSectionClass}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Tim saya</h3>
            <Link href="/me/teams" className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
              Semua
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {myItems.slice(0, 3).map((t) => (
              <MyTeamMini key={t.slug} team={t} />
            ))}
          </div>
        </section>
      )}

      <section className={sidebarSectionClass}>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <ChartBarIcon className="size-4 text-indigo-500 dark:text-indigo-400" />
          Ritme tim juara
        </h3>
        <ol className="mt-3 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">1</span>
            Bentuk tim & bagi peran
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">2</span>
            Kolaborasi aset & notebook
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">3</span>
            Submission kompetisi bersama
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">4</span>
            Naik peringkat & reputasi tim
          </li>
        </ol>
      </section>

      <section className={sidebarTipClass}>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-800 dark:text-neutral-100">
          <SparklesIcon className="size-4" aria-hidden />
          Tips semangat tim
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">{tip}</p>
      </section>

      {isLoggedIn ? (
        <button
          type="button"
          onClick={onCreateClick}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <PlusIcon className="size-4" aria-hidden />
          Buat tim baru
        </button>
      ) : (
        <Link
          href="/login?next=/teams"
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Masuk & bentuk tim
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      )}
    </aside>
  )
}
