'use client'

import {
  AdminContentCard,
  AdminPageHeader,
  AdminPageSkeleton,
  AdminTable,
  AdminTableEmpty,
  ConfirmDialog,
} from '@/components/admin/AdminShared'
import {
  getAdminNotebookKernelKtmUrl,
  listNotebookKernelRequests,
  reviewNotebookKernelRequest,
} from '@/lib/api/admin'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { AdminNotebookKernelRequest } from '@/types/api'
import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

const statusColor: Record<string, 'green' | 'yellow' | 'red' | 'zinc'> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
}

const typeLabel: Record<string, string> = {
  student: 'Mahasiswa',
  umum: 'Umum',
}

export default function AdminNotebookKernelRequestsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('')

  const list = useQuery({
    queryKey: ['admin', 'notebook-kernel-requests', statusFilter],
    queryFn: () =>
      listNotebookKernelRequests({
        page_size: 50,
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
  })

  const review = useMutation({
    mutationFn: ({
      id,
      status,
      review_note,
    }: {
      id: string
      status: 'approved' | 'rejected'
      review_note?: string
    }) => reviewNotebookKernelRequest(id, { status, review_note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'notebook-kernel-requests'] }),
  })

  const openKtm = async (id: string) => {
    const { url } = await getAdminNotebookKernelKtmUrl(id)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      <AdminPageHeader
        title="Pengajuan Kernel Notebook"
        description="Tinjau permintaan akses kernel server — mahasiswa (NIM + KTM) dan umum."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { id: '', label: 'Semua' },
          { id: 'pending', label: 'Menunggu' },
          { id: 'approved', label: 'Disetujui' },
          { id: 'rejected', label: 'Ditolak' },
        ].map((f) => (
          <Button
            key={f.id || 'all'}
            type="button"
            outline={statusFilter !== f.id}
            onClick={() => setStatusFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {list.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          {(list.data?.items ?? []).length === 0 ? (
            <AdminTableEmpty>Belum ada pengajuan kernel.</AdminTableEmpty>
          ) : (
            <AdminTable>
              <TableHead>
                <TableRow>
                  <TableHeader className="w-[14%]">Pemohon</TableHeader>
                  <TableHeader className="w-[8%]">Tipe</TableHeader>
                  <TableHeader className="w-[14%]">NIM / Institusi</TableHeader>
                  <TableHeader className="w-[32%]">Alasan</TableHeader>
                  <TableHeader className="w-[10%]">KTM</TableHeader>
                  <TableHeader className="w-[10%]" nowrap>Status</TableHeader>
                  <TableHeader className="w-[12%]" nowrap>Aksi</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(list.data?.items ?? []).map((app: AdminNotebookKernelRequest) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="font-medium">{app.user.name}</div>
                      <div className="text-xs text-neutral-500">@{app.user.username}</div>
                      <div className="text-xs text-neutral-400">{app.user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge color={app.applicant_type === 'student' ? 'violet' : 'zinc'}>
                        {typeLabel[app.applicant_type] ?? app.applicant_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {app.nim && <div className="font-mono">{app.nim}</div>}
                      {app.institution && <div className="text-neutral-500">{app.institution}</div>}
                      {!app.nim && !app.institution && '—'}
                    </TableCell>
                    <TableCell>
                      <SimpleMarkdown
                        content={
                          app.reason_md.slice(0, 200) + (app.reason_md.length > 200 ? '…' : '')
                        }
                      />
                    </TableCell>
                    <TableCell nowrap>
                      {app.has_ktm ? (
                        <Button type="button" onClick={() => void openKtm(app.id)}>
                          Lihat KTM
                        </Button>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </TableCell>
                    <TableCell nowrap>
                      <Badge color={statusColor[app.status] ?? 'zinc'}>{app.status}</Badge>
                    </TableCell>
                    <TableCell nowrap className="space-x-2">
                      {app.status === 'pending' && (
                        <>
                          <Button onClick={() => review.mutate({ id: app.id, status: 'approved' })}>
                            Setujui
                          </Button>
                          <ConfirmDialog
                            label="Tolak"
                            danger
                            confirm={`Tolak pengajuan kernel dari ${app.user.name}?`}
                            onConfirm={() =>
                              review.mutate({
                                id: app.id,
                                status: 'rejected',
                                review_note: 'Pengajuan tidak memenuhi kriteria saat ini.',
                              })
                            }
                          />
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </AdminTable>
          )}
        </AdminContentCard>
      )}
    </div>
  )
}
