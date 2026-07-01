'use client'

import { addOrgTeamMember, createOrgTeam } from '@/lib/api/orgs'
import { orgCan } from '@/lib/orgs/permissions'
import { orgCard, orgText, orgTextMuted } from '@/lib/orgs/org-ui'
import { OrgDetail } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export function OrgTeamsTab({
  orgId,
  handle,
  org,
  myRole,
}: {
  orgId: string
  handle: string
  org: OrgDetail
  myRole: string | null | undefined
}) {
  const teams = org.teams ?? []
  const members = org.members ?? []
  const qc = useQueryClient()
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['org', handle] })

  const createMut = useMutation({
    mutationFn: () => createOrgTeam(orgId, teamName.trim()),
    onSuccess: () => {
      setTeamName('')
      invalidate()
    },
    onError: (e: Error) => setError(e.message),
  })

  const addMut = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      addOrgTeamMember(orgId, teamId, userId),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  })

  const canManage = orgCan(myRole, 'manage_teams')

  return (
    <div className="space-y-6">
      {canManage && (
        <div className={`flex flex-wrap gap-2 ${orgCard} p-4`}>
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Nama tim baru"
            className="!rounded-xl min-w-[200px] flex-1"
          />
          <ButtonPrimary
            type="button"
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !teamName.trim()}
          >
            Buat tim
          </ButtonPrimary>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {teams.map((t) => (
          <div key={t.id} className={`${orgCard} p-4`}>
            <h3 className={`font-semibold ${orgText}`}>{t.name}</h3>
            <p className={`mt-1 text-sm ${orgTextMuted}`}>{t.member_count ?? t.members?.length ?? 0} anggota</p>
            <ul className="mt-3 space-y-1">
              {(t.members ?? []).map((m) => (
                <li key={m.user_id} className={`text-sm ${orgTextMuted}`}>
                  @{m.username}
                </li>
              ))}
            </ul>
            {canManage && (
              <div className="mt-3 flex gap-2">
                <Select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) addMut.mutate({ teamId: t.id, userId: e.target.value })
                  }}
                  className="!rounded-lg !text-sm"
                >
                  <option value="">Tambah anggota…</option>
                  {members
                    .filter((m) => !(t.members ?? []).some((tm) => tm.user_id === m.user_id))
                    .map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        @{m.username}
                      </option>
                    ))}
                </Select>
              </div>
            )}
          </div>
        ))}
        {!teams.length && (
          <p className={`col-span-full text-sm ${orgTextMuted}`}>Belum ada tim dalam organisasi ini.</p>
        )}
      </div>
    </div>
  )
}
