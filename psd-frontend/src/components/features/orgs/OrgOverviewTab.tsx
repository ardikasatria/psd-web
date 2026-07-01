'use client'

import { OrgDetail, OrgMember } from '@/types/api'
import { orgCan, orgRoleLabel } from '@/lib/orgs/permissions'
import { orgTypeLabel } from '@/lib/orgs/org-utils'
import { orgCard, orgCardMuted, orgDivider, orgText, orgTextMuted } from '@/lib/orgs/org-ui'
import { OrgVerificationBadge } from '@/components/features/orgs/OrgVerificationBadge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import { UserGroupIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export function OrgOverviewTab({
  org,
  handle,
  myRole,
  isMember,
}: {
  org: OrgDetail
  handle: string
  myRole: string | null | undefined
  isMember: boolean
}) {
  const members = org.members ?? []

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className={`${orgCardMuted} h-full p-5`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge color="sky">{orgTypeLabel[org.type]}</Badge>
            <OrgVerificationBadge status={org.verification} />
          </div>
          <h3 className={`text-sm font-semibold ${orgText}`}>Tentang organisasi</h3>
          <p className={`mt-2 text-sm leading-relaxed ${orgTextMuted}`}>
            {org.description || 'Belum ada deskripsi organisasi.'}
          </p>
          {myRole && (
            <p className={`mt-3 text-sm ${orgTextMuted}`}>
              Peran Anda:{' '}
              <span className="font-medium text-primary-600 dark:text-primary-400">
                {orgRoleLabel[myRole] ?? myRole}
              </span>
            </p>
          )}
        </section>

        <section className={`${orgCard} h-full`}>
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-700">
            <h3 className={`text-sm font-semibold ${orgText}`}>Anggota ({members.length})</h3>
            {isMember && orgCan(myRole, 'manage_members') && (
              <Link href={`/orgs/${handle}?tab=members`} className="text-xs font-medium text-primary-600 dark:text-primary-400">
                Kelola anggota →
              </Link>
            )}
          </div>
          <ul className={`divide-y ${orgDivider}`}>
            {members.slice(0, 6).map((m: OrgMember) => (
              <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
                  <UserGroupIcon className="size-4 text-neutral-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${orgText}`}>{m.name ?? m.username}</p>
                  <p className={`text-xs ${orgTextMuted}`}>@{m.username}</p>
                </div>
                <Badge color="zinc">{orgRoleLabel[m.role] ?? m.role}</Badge>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {(org.assets ?? []).length > 0 && (
        <section className={`${orgCard} p-5`}>
          <h3 className={`text-sm font-semibold ${orgText}`}>Aset publik</h3>
          <ul className="mt-3 space-y-2">
            {(org.assets ?? []).slice(0, 5).map((a) => (
              <li key={a.id} className={`text-sm ${orgTextMuted}`}>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{a.title}</span>
                <span className="mx-2">·</span>
                {a.kind}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isMember && (
        <div className="flex flex-wrap gap-2">
          <ButtonPrimary href={`/orgs/${handle}?tab=assets`} outline>
            Lihat aset
          </ButtonPrimary>
          {orgCan(myRole, 'manage_settings') && (
            <ButtonPrimary href={`/orgs/${handle}?tab=settings`} outline>
              Pengaturan
            </ButtonPrimary>
          )}
        </div>
      )}
    </div>
  )
}
