'use client'

import { inviteMember, removeMember, setRole, transferOwner } from '@/lib/api/teams'
import { can, normalizeTeamRole, roleLabel } from '@/lib/teams/permissions'
import { teamCard, teamDivider, teamText, teamTextMuted } from '@/lib/teams/team-ui'
import { Team, TeamMember } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { UserGroupIcon } from '@heroicons/react/24/outline'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export function TeamMembersTab({
  slug,
  team,
  myRole,
  currentUsername,
}: {
  slug: string
  team: Team
  myRole: string | null | undefined
  currentUsername?: string
}) {
  const role = normalizeTeamRole(myRole)
  const qc = useQueryClient()
  const [inviteUsername, setInviteUsername] = useState('')
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['team', slug] })

  const inviteMut = useMutation({
    mutationFn: () => inviteMember(slug, inviteUsername.trim()),
    onSuccess: () => {
      setInviteUsername('')
      setError(null)
    },
    onError: (e: Error) => setError(e.message),
  })

  const roleMut = useMutation({
    mutationFn: ({ username, newRole }: { username: string; newRole: string }) =>
      setRole(slug, username, newRole),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  })

  const kickMut = useMutation({
    mutationFn: (username: string) => removeMember(slug, username),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  })

  const transferMut = useMutation({
    mutationFn: (username: string) => transferOwner(slug, username),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  })

  const canInvite = can(role, 'invite')
  const canKick = can(role, 'kick')
  const canModerate = can(role, 'moderate_members')
  const canTransfer = can(role, 'transfer_ownership')

  return (
    <div className="space-y-6">
      {canInvite && (
        <div className={`flex flex-wrap gap-2 ${teamCard} p-4`}>
          <Input
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            placeholder="Username untuk diundang"
            className="!rounded-xl min-w-[200px] flex-1"
          />
          <ButtonPrimary
            type="button"
            onClick={() => inviteMut.mutate()}
            disabled={inviteMut.isPending || !inviteUsername.trim()}
          >
            Undang
          </ButtonPrimary>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <ul className={`divide-y ${teamDivider} ${teamCard}`}>
        {team.members.map((m: TeamMember) => {
          const memberRole = normalizeTeamRole(m.role)
          const isSelf = m.username === currentUsername
          const canEdit =
            canModerate &&
            !isSelf &&
            memberRole !== 'owner' &&
            (role === 'owner' || memberRole === 'member' || memberRole === 'co-owner')

          return (
            <li key={m.username} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
                  <UserGroupIcon className="size-4 text-neutral-500" />
                </div>
                <div>
                  <p className={`font-medium ${teamText}`}>{m.name ?? m.username}</p>
                  <p className={`text-sm ${teamTextMuted}`}>@{m.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canEdit ? (
                  <>
                    <Select
                      value={memberRole ?? 'member'}
                      onChange={(e) => {
                        const newRole = e.target.value
                        if (newRole === 'owner') {
                          if (!confirm(`Transfer kepemilikan ke ${m.username}?`)) return
                          transferMut.mutate(m.username)
                          return
                        }
                        roleMut.mutate({ username: m.username, newRole })
                      }}
                      className="!rounded-lg text-sm"
                    >
                      <option value="member">Anggota</option>
                      <option value="co-owner">Co-owner</option>
                      {canTransfer && <option value="owner">Transfer owner</option>}
                    </Select>
                    {canKick && (
                      <ButtonPrimary
                        type="button"
                        outline
                        onClick={() => {
                          if (confirm(`Keluarkan ${m.username} dari tim?`)) kickMut.mutate(m.username)
                        }}
                      >
                        Keluarkan
                      </ButtonPrimary>
                    )}
                  </>
                ) : (
                  <Badge color="zinc">{roleLabel[memberRole ?? m.role] ?? m.role}</Badge>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
