import { TeamSummary } from '@/types/api'
import {
  BeakerIcon,
  TrophyIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'

const CARD_ACCENTS = [
  'from-primary-400 to-indigo-500',
  'from-sky-400 to-indigo-600',
  'from-amber-400 to-primary-500',
  'from-indigo-400 to-violet-500',
] as const

function avatarInitial(username: string) {
  return username.slice(0, 1).toUpperCase()
}

function MemberAvatars({ members }: { members: NonNullable<TeamSummary['member_preview']> }) {
  if (members.length === 0) return null
  return (
    <div className="flex -space-x-2">
      {members.slice(0, 4).map((m) => (
        <span
          key={m.username}
          className="inline-flex size-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-primary-100 to-sky-100 text-[10px] font-bold text-primary-700 dark:border-neutral-800 dark:from-primary-900 dark:to-indigo-900 dark:text-primary-200"
          title={`@${m.username}`}
        >
          {m.avatar_url ? (
            <Image src={m.avatar_url} alt="" width={28} height={28} className="size-full object-cover" unoptimized />
          ) : (
            avatarInitial(m.username)
          )}
        </span>
      ))}
    </div>
  )
}

export function TeamCard({ team, index = 0 }: { team: TeamSummary; index?: number }) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
  const isCompetitive = (team.competitions_count ?? 0) >= 3

  return (
    <Link
      href={`/teams/${team.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800"
    >
      <div className={clsx('relative h-20 bg-gradient-to-br px-5 py-4', accent)}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -end-6 -top-6 size-24 rounded-full bg-white/30 blur-xl" />
        </div>
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
            <UserGroupIcon className="size-6" aria-hidden />
          </div>
          {isCompetitive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 shadow-sm dark:bg-neutral-900/90 dark:text-amber-300">
              <TrophyIcon className="size-3" aria-hidden />
              Kompetitif
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-1 text-lg font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
              {team.name}
            </h3>
            {team.focus && (
              <p className="mt-0.5 text-xs font-medium text-primary-600 dark:text-primary-400">{team.focus}</p>
            )}
          </div>
          {team.member_preview && team.member_preview.length > 0 && (
            <MemberAvatars members={team.member_preview} />
          )}
        </div>

        {team.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {team.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-700">
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
            <UserGroupIcon className="size-3.5" aria-hidden />
            {team.member_count ?? 0} anggota
          </span>
          {(team.assets_count ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
              <BeakerIcon className="size-3.5" aria-hidden />
              {team.assets_count} aset
            </span>
          )}
          {(team.competitions_count ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <TrophyIcon className="size-3.5" aria-hidden />
              {team.competitions_count} kompetisi
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
