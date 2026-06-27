'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, AdminTableEmpty, ConfirmDialog } from '@/components/admin/AdminShared'
import { deleteAdminRepo, listAdminRepos, updateAdminRepo } from '@/lib/api/admin'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { Switch } from '@/shared/switch'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { RepoSummary } from '@/types/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

export default function AdminReposPage() {
  const [q, setQ] = useState('')
  const qc = useQueryClient()
  const repos = useQuery({ queryKey: ['admin', 'repos', q], queryFn: () => listAdminRepos({ q }) })
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'repos'] })
    qc.invalidateQueries({ queryKey: ['discover'] })
  }

  const setVisibility = useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: 'public' | 'private' }) =>
      updateAdminRepo(id, { visibility }),
    onSuccess: invalidate,
  })
  const toggleFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => updateAdminRepo(id, { featured }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteAdminRepo(id),
    onSuccess: invalidate,
  })

  const kindPath = (kind: string) => (kind === 'project' ? 'projects' : kind === 'dataset' ? 'datasets' : 'models')

  return (
    <div>
      <AdminPageHeader title="Aset" description="Kelola semua aset termasuk yang privat." />
      <div className="mb-6 max-w-md">
        <Input type="search" placeholder="Cari aset..." value={q} onChange={(e) => setQ(e.target.value)} className="!rounded-xl" />
      </div>
      {repos.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader>Nama</TableHeader>
                <TableHeader>Jenis</TableHeader>
                <TableHeader>Pemilik</TableHeader>
                <TableHeader>Visibilitas</TableHeader>
                <TableHeader>Pilihan</TableHeader>
                <TableHeader>Aksi</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(repos.data?.items ?? []).map((r: RepoSummary) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/${kindPath(r.kind)}/${r.owner.username}/${r.name}`} className="font-medium text-primary-600 hover:underline">
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell><Badge color="zinc">{r.kind}</Badge></TableCell>
                  <TableCell>{r.owner.username}</TableCell>
                  <TableCell>
                    <Select
                      value={r.visibility}
                      onChange={(e) => setVisibility.mutate({ id: r.id, visibility: e.target.value as 'public' | 'private' })}
                      className="!min-w-[7rem] !rounded-lg"
                    >
                      <option value="public">public</option>
                      <option value="private">private</option>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={!!r.featured}
                      onChange={(v) => toggleFeatured.mutate({ id: r.id, featured: v })}
                      color="green"
                    />
                  </TableCell>
                  <TableCell>
                    <ConfirmDialog
                      label="Hapus"
                      danger
                      confirm={`Hapus aset ${r.name}? Tindakan ini permanen.`}
                      onConfirm={() => remove.mutate(r.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
        </AdminContentCard>
      )}
    </div>
  )
}
