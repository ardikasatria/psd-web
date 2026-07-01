'use client'

import { createOrgAsset, setAssetGrant } from '@/lib/api/orgs'
import { orgCan } from '@/lib/orgs/permissions'
import { ACCESS_LEVELS } from '@/lib/orgs/org-utils'
import { orgCard, orgText, orgTextMuted } from '@/lib/orgs/org-ui'
import { OrgDetail } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import Select from '@/shared/Select'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

const ASSET_KINDS = ['project', 'model', 'dataset', 'notebook', 'idea_space', 'data_factory'] as const

export function OrgAssetsTab({
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
  const assets = org.assets ?? []
  const teams = org.teams ?? []
  const members = org.members ?? []
  const qc = useQueryClient()
  const [kind, setKind] = useState<string>(ASSET_KINDS[0])
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['org', handle] })

  const createMut = useMutation({
    mutationFn: () => createOrgAsset(orgId, kind),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  })

  const grantMut = useMutation({
    mutationFn: (p: { aid: string; team_id?: string; user_id?: string; level: string }) =>
      setAssetGrant(orgId, p.aid, { team_id: p.team_id, user_id: p.user_id, level: p.level }),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  })

  const canManage = orgCan(myRole, 'manage_assets')

  return (
    <div className="space-y-6">
      {canManage && (
        <div className={`flex flex-wrap items-end gap-2 ${orgCard} p-4`}>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Jenis aset
            </label>
            <Select value={kind} onChange={(e) => setKind(e.target.value)} className="!rounded-xl">
              {ASSET_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </div>
          <ButtonPrimary type="button" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            Buat aset
          </ButtonPrimary>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="space-y-4">
        {assets.map((a) => (
          <div key={a.id} className={`${orgCard} p-4`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className={`font-semibold ${orgText}`}>{a.title}</h3>
                <p className={`text-sm ${orgTextMuted}`}>
                  {a.kind}
                  {a.path && ` · ${a.path}`}
                </p>
              </div>
              {a.my_access && (
                <Badge color="emerald" title="Akses efektif Anda">
                  Akses saya: {a.my_access}
                </Badge>
              )}
            </div>

            {canManage && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-700">
                <Select
                  defaultValue=""
                  onChange={(e) => {
                    const [type, id, level] = e.target.value.split(':')
                    if (!id || !level) return
                    grantMut.mutate({
                      aid: a.id,
                      ...(type === 'team' ? { team_id: id } : { user_id: id }),
                      level,
                    })
                    e.target.value = ''
                  }}
                  className="!rounded-lg !text-sm"
                >
                  <option value="">Set grant akses…</option>
                  <optgroup label="Via tim">
                    {teams.map((t) =>
                      ACCESS_LEVELS.map((lvl) => (
                        <option key={`t-${t.id}-${lvl}`} value={`team:${t.id}:${lvl}`}>
                          Tim {t.name} → {lvl}
                        </option>
                      )),
                    )}
                  </optgroup>
                  <optgroup label="Langsung ke anggota">
                    {members.map((m) =>
                      ACCESS_LEVELS.map((lvl) => (
                        <option key={`u-${m.user_id}-${lvl}`} value={`user:${m.user_id}:${lvl}`}>
                          @{m.username} → {lvl}
                        </option>
                      )),
                    )}
                  </optgroup>
                </Select>
              </div>
            )}
          </div>
        ))}
        {!assets.length && (
          <p className={`text-sm ${orgTextMuted}`}>Belum ada aset milik organisasi.</p>
        )}
      </div>
    </div>
  )
}
