'use client'

import { inviteOrgMember, removeOrgMember, setOrgRole } from '@/lib/api/orgs'
import { orgCan, canSetOrgRole, orgRoleLabel } from '@/lib/orgs/permissions'
import { isLastOwner } from '@/lib/orgs/org-utils'
import { orgCard, orgText, orgTextMuted } from '@/lib/orgs/org-ui'
import { OrgDetail, OrgMember } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

const ROLES = ['owner', 'admin', 'member', 'billing_manager'] as const

export function OrgMembersTab({
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
  const members = org.members ?? []
  const qc = useQueryClient()
  const [inviteUsername, setInviteUsername] = useState('')
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['org', handle] })

  const inviteMut = useMutation({
    mutationFn: () => inviteOrgMember(orgId, inviteUsername.trim()),
    onSuccess: () => {
      setInviteUsername('')
      setError(null)
      invalidate()
    },
    onError: (e: Error) => setError(e.message),
  })

  const roleMut = useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: string }) => setOrgRole(orgId, uid, role),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  })

  const removeMut = useMutation({
    mutationFn: (uid: string) => removeOrgMember(orgId, uid),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  })

  const canInvite = orgCan(myRole, 'manage_members')

  return (
    <div className="space-y-6">
      {canInvite && (
        <div className={`flex flex-wrap gap-2 ${orgCard} p-4`}>
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

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <ul className={`divide-y rounded-2xl border border-neutral-200/80 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-800`}>
        {members.map((m: OrgMember) => {
          const lastOwner = isLastOwner(
            members.map((x) => ({ user_id: x.user_id, role: x.role })),
            m.user_id,
          )
          const canManage = orgCan(myRole, 'manage_members')
          const canRemove = canManage && !lastOwner
          const editableRoles = ROLES.filter((r) => canSetOrgRole(myRole, m.role, r))
          const canEditRole = canManage && editableRoles.length > 0 && !(lastOwner && m.role === 'owner')

          return (
            <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${orgText}`}>{m.name ?? m.username}</p>
                <p className={`text-sm ${orgTextMuted}`}>@{m.username}</p>
              </div>
              <Badge color="zinc">{orgRoleLabel[m.role] ?? m.role}</Badge>

              {canEditRole && (
                <Select
                  value={m.role}
                  disabled={lastOwner && m.role === 'owner'}
                  title={lastOwner ? 'Owner terakhir tidak bisa didemovasi' : undefined}
                  onChange={(e) => roleMut.mutate({ uid: m.user_id, role: e.target.value })}
                  className="!min-w-[8rem] !rounded-lg"
                >
                  {ROLES.filter((r) => canSetOrgRole(myRole, m.role, r)).map((r) => (
                    <option key={r} value={r}>
                      {orgRoleLabel[r]}
                    </option>
                  ))}
                </Select>
              )}

              {canRemove ? (
                <ButtonPrimary
                  type="button"
                  outline
                  onClick={() => removeMut.mutate(m.user_id)}
                  disabled={removeMut.isPending}
                >
                  Keluarkan
                </ButtonPrimary>
              ) : lastOwner ? (
                <span
                  className="cursor-not-allowed text-xs text-neutral-400"
                  title="Owner terakhir tidak bisa dihapus atau didemovasi"
                >
                  Owner terakhir
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
