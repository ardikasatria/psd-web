'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, AdminTableEmpty, AdminTableFooter, AdminTableToolbar, ConfirmDialog } from '@/components/admin/AdminShared'
import { deleteUser, listUsers, updateUser } from '@/lib/api/admin'
import { useSuperadminGuard } from '@/lib/auth/useSuperadminGuard'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { Switch } from '@/shared/switch'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { AdminUser } from '@/types/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

const ROLE_LABELS: Record<string, string> = {
  member: 'Member',
  moderator: 'Humas',
  superadmin: 'Super Admin',
}

export default function AdminUsersPage() {
  const { user, isLoading: guardLoading } = useSuperadminGuard()
  const [q, setQ] = useState('')
  const qc = useQueryClient()
  const users = useQuery({
    queryKey: ['admin', 'users', q],
    queryFn: () => listUsers({ q }),
    enabled: !!user,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] })

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => updateUser(id, { role }),
    onSuccess: invalidate,
  })
  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updateUser(id, { is_active }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: invalidate,
  })

  const handleRoleChange = (u: AdminUser, nextRole: string) => {
    if (nextRole === u.role) return
    if (nextRole === 'superadmin') {
      const ok = window.confirm(
        `Jadikan @${u.username} sebagai Super Admin? Hak akses penuh akan diberikan.`
      )
      if (!ok) return
    }
    setRole.mutate({ id: u.id, role: nextRole })
  }

  if (guardLoading || !user) {
    return <AdminPageSkeleton />
  }

  return (
    <div>
      <AdminPageHeader title="Pengguna" description="Kelola akun, role, dan status aktif pengguna." />
      {users.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          <AdminTableToolbar>
            <Input
              type="search"
              placeholder="Cari nama atau email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="!w-full !max-w-md !rounded-xl sm:!w-auto"
            />
          </AdminTableToolbar>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader>Nama</TableHeader>
                <TableHeader>Username</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Role</TableHeader>
                <TableHeader>Aktif</TableHeader>
                <TableHeader>Aksi</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(users.data?.items ?? []).map((u: AdminUser) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>@{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                      className="!min-w-[8rem] !rounded-lg"
                    >
                      <option value="member">{ROLE_LABELS.member}</option>
                      <option value="moderator">{ROLE_LABELS.moderator}</option>
                      <option value="superadmin">{ROLE_LABELS.superadmin}</option>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={u.is_active}
                        onChange={(v) => toggleActive.mutate({ id: u.id, is_active: v })}
                        color="green"
                      />
                      <Badge color={u.is_active ? 'green' : 'zinc'}>{u.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ConfirmDialog
                      label="Hapus"
                      danger
                      confirm={`Hapus pengguna ${u.username}? Tindakan ini permanen.`}
                      onConfirm={() => remove.mutate(u.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
          {!users.data?.items.length ? (
            <AdminTableEmpty>Tidak ada pengguna.</AdminTableEmpty>
          ) : (
            <AdminTableFooter>
              <span>
                Menampilkan <span className="font-medium text-neutral-900 dark:text-neutral-200">{users.data.items.length}</span> pengguna
              </span>
            </AdminTableFooter>
          )}
        </AdminContentCard>
      )}
    </div>
  )
}
