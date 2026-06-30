'use client'

import { Team, TeamMember } from '@/types/api'
import { can, normalizeTeamRole, roleLabel } from '@/lib/teams/permissions'
import { teamCard, teamCardMuted, teamDivider, teamText, teamTextMuted } from '@/lib/teams/team-ui'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import { UserGroupIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export function TeamOverviewTab({
  team,
  slug,
  myRole,
  isMember,
}: {
  team: Team
  slug: string
  myRole: string | null | undefined
  isMember: boolean
}) {
  const role = normalizeTeamRole(myRole)

  return (
    <div className="space-y-6">
      <section className={`${teamCardMuted} p-5`}>
        <h3 className={`text-sm font-semibold ${teamText}`}>Tentang tim</h3>
        <p className={`mt-2 text-sm leading-relaxed ${teamTextMuted}`}>
          {team.description || 'Belum ada deskripsi tim.'}
        </p>
        {role && (
          <p className={`mt-3 text-sm ${teamTextMuted}`}>
            Peran Anda: <span className="font-medium text-primary-600 dark:text-primary-400">{roleLabel[role] ?? role}</span>
          </p>
        )}
      </section>

      <section className={teamCard}>
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-700">
          <h3 className={`text-sm font-semibold ${teamText}`}>Anggota ({team.members.length})</h3>
          {isMember && can(role, 'moderate_members') && (
            <Link href={`/teams/${slug}?tab=members`} className="text-xs font-medium text-primary-600 dark:text-primary-400">
              Kelola →
            </Link>
          )}
        </div>
        <ul className={`divide-y ${teamDivider}`}>
          {team.members.slice(0, 6).map((m: TeamMember) => (
            <li key={m.username} className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
                <UserGroupIcon className="size-4 text-neutral-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${teamText}`}>{m.name ?? m.username}</p>
                <p className={`text-xs ${teamTextMuted}`}>@{m.username}</p>
              </div>
              <Badge color="zinc">{roleLabel[normalizeTeamRole(m.role) ?? m.role] ?? m.role}</Badge>
            </li>
          ))}
        </ul>
      </section>

      {isMember && (
        <div className="flex flex-wrap gap-2">
          <ButtonPrimary href={`/teams/${slug}?tab=assets`} outline>
            Lihat aset
          </ButtonPrimary>
          <ButtonPrimary href={`/teams/${slug}?tab=discussion`} outline>
            Diskusi
          </ButtonPrimary>
          <ButtonPrimary href={`/teams/${slug}?tab=files`} outline>
            File
          </ButtonPrimary>
        </div>
      )}
    </div>
  )
}
