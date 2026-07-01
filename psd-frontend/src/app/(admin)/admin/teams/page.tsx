'use client'

import {
  AdminContentCard,
  AdminPageHeader,
  AdminPageSkeleton,
  AdminTable,
  AdminTableEmpty,
  AdminTableFooter,
  AdminTableToolbar,
  ConfirmDialog,
} from '@/components/admin/AdminShared'
import { deleteAdminTeam, listAdminTeams, updateAdminTeam } from '@/lib/api/admin'
import { useAdminGuard } from '@/lib/auth/useAdminGuard'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { Switch } from '@/shared/switch'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { AdminTeam } from '@/types/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

export default function AdminTeamsPage() {
  const { user, isLoading: guardLoading } = useAdminGuard()
  const [q, setQ] = useState('')
  const qc = useQueryClient()

  const teams = useQuery({
    queryKey: ['admin', 'teams', q],
    queryFn: () => listAdminTeams({ q }),
    enabled: !!user,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'teams'] })
    qc.invalidateQueries({ queryKey: ['teams'] })
  }

  const setVisibility = useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: 'public' | 'private' }) =>
      updateAdminTeam(id, { visibility }),
    onSuccess: invalidate,
  })

  const toggleFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => updateAdminTeam(id, { featured }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteAdminTeam(id),
    onSuccess: invalidate,
  })

  if (guardLoading || !user) {
    return <AdminPageSkeleton />
  }

  return (
    <div>
      <AdminPageHeader
        title="Tim Kolaborasi"
        description="Kelola tim publik, sorot tim UMKM/organisasi, dan moderasi visibilitas."
      />
      {teams.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          <AdminTableToolbar>
            <Input
              type="search"
              placeholder="Cari nama, slug, fokus, atau owner…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="!w-full !max-w-md !rounded-xl sm:!w-auto"
            />
          </AdminTableToolbar>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader>Tim</TableHeader>
                <TableHeader>Owner</TableHeader>
                <TableHeader>Fokus</TableHeader>
                <TableHeader>Anggota</TableHeader>
                <TableHeader>Visibilitas</TableHeader>
                <TableHeader>Sorotan</TableHeader>
                <TableHeader>Aksi</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(teams.data?.items ?? []).map((t: AdminTeam) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link
                      href={`/teams/${t.slug}`}
                      className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                      {t.name}
                    </Link>
                    <p className="text-xs text-neutral-500">/{t.slug}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span>@{t.owner_username}</span>
                      {t.owner_account_type === 'organization' && (
                        <Badge color="sky">Organisasi</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {t.focus ? (
                      <Badge color="amber">{t.focus}</Badge>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>{t.member_count}</TableCell>
                  <TableCell>
                    <Select
                      value={t.visibility}
                      onChange={(e) =>
                        setVisibility.mutate({ id: t.id, visibility: e.target.value as 'public' | 'private' })
                      }
                      className="!min-w-[7rem] !rounded-lg"
                    >
                      <option value="public">Publik</option>
                      <option value="private">Privat</option>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!t.featured}
                        onChange={(v) => toggleFeatured.mutate({ id: t.id, featured: v })}
                        color="amber"
                      />
                      <Badge color={t.featured ? 'amber' : 'zinc'}>{t.featured ? 'Sorot' : '—'}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ConfirmDialog
                      label="Hapus"
                      danger
                      confirm={`Hapus tim "${t.name}"? Semua keanggotaan akan dihapus.`}
                      onConfirm={() => remove.mutate(t.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
          {!teams.data?.items.length ? (
            <AdminTableEmpty>Tidak ada tim.</AdminTableEmpty>
          ) : (
            <AdminTableFooter>
              <span>
                Menampilkan{' '}
                <span className="font-medium text-neutral-900 dark:text-neutral-200">
                  {teams.data.items.length}
                </span>{' '}
                tim
              </span>
            </AdminTableFooter>
          )}
        </AdminContentCard>
      )}
    </div>
  )
}
