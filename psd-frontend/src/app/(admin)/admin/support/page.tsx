'use client'

import {
  AdminContentCard,
  AdminPageHeader,
  AdminPageSkeleton,
  AdminTable,
  AdminTableEmpty,
} from '@/components/admin/AdminShared'
import {
  adminListTickets,
  adminTicketAction,
  TICKET_STATUS_LABELS,
} from '@/lib/api/reports'
import type { AdminTicket } from '@/types/api'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

const statusColor: Record<string, 'green' | 'yellow' | 'blue' | 'zinc'> = {
  open: 'yellow',
  in_progress: 'blue',
  resolved: 'green',
  closed: 'zinc',
}

const priorityColor: Record<string, 'red' | 'orange' | 'yellow' | 'zinc'> = {
  kritis: 'red',
  tinggi: 'orange',
  sedang: 'yellow',
  rendah: 'zinc',
}

export default function AdminSupportTicketsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const list = useQuery({
    queryKey: ['admin', 'support-tickets', statusFilter, priorityFilter],
    queryFn: () =>
      adminListTickets({
        page_size: 50,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
      }),
  })

  const action = useMutation({
    mutationFn: ({ id, act }: { id: string; act: 'assign' | 'resolve' | 'close' | 'reopen' }) =>
      adminTicketAction(id, act),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'support-tickets'] }),
  })

  return (
    <div>
      <AdminPageHeader
        title="Tiket Pengaduan"
        description="Kelola pengaduan platform dari pengguna — urut prioritas & umur."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { id: '', label: 'Semua status' },
          { id: 'open', label: 'Terbuka' },
          { id: 'in_progress', label: 'Diproses' },
          { id: 'resolved', label: 'Selesai' },
          { id: 'closed', label: 'Ditutup' },
        ].map((f) => (
          <Button key={f.id || 'all'} outline={statusFilter !== f.id} onClick={() => setStatusFilter(f.id)}>
            {f.label}
          </Button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { id: '', label: 'Semua prioritas' },
          { id: 'kritis', label: 'Kritis' },
          { id: 'tinggi', label: 'Tinggi' },
          { id: 'sedang', label: 'Sedang' },
          { id: 'rendah', label: 'Rendah' },
        ].map((f) => (
          <Button key={f.id || 'all-p'} outline={priorityFilter !== f.id} onClick={() => setPriorityFilter(f.id)}>
            {f.label}
          </Button>
        ))}
      </div>

      {list.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          {(list.data?.items ?? []).length === 0 ? (
            <AdminTableEmpty>Belum ada tiket.</AdminTableEmpty>
          ) : (
            <AdminTable>
              <TableHead>
                <TableRow>
                  <TableHeader className="w-[22%]">Pemohon</TableHeader>
                  <TableHeader className="w-[28%]">Subjek</TableHeader>
                  <TableHeader className="w-[10%]">Kategori</TableHeader>
                  <TableHeader className="w-[10%]" nowrap>Prioritas</TableHeader>
                  <TableHeader className="w-[10%]" nowrap>Status</TableHeader>
                  <TableHeader className="w-[20%]" nowrap>Aksi</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(list.data?.items ?? []).map((t: AdminTicket) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.user.username}</div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{t.subject}</p>
                      <p className="text-xs text-neutral-500">{new Date(t.created_at).toLocaleString('id-ID')}</p>
                    </TableCell>
                    <TableCell className="text-sm">{t.category}</TableCell>
                    <TableCell nowrap>
                      <Badge color={priorityColor[t.priority] ?? 'zinc'}>{t.priority}</Badge>
                    </TableCell>
                    <TableCell nowrap>
                      <Badge color={statusColor[t.status] ?? 'zinc'}>
                        {TICKET_STATUS_LABELS[t.status] ?? t.status}
                      </Badge>
                    </TableCell>
                    <TableCell nowrap className="space-x-1">
                      {t.status === 'open' && (
                        <Button onClick={() => action.mutate({ id: t.id, act: 'assign' })}>Ambil</Button>
                      )}
                      {(t.status === 'open' || t.status === 'in_progress') && (
                        <Button outline onClick={() => action.mutate({ id: t.id, act: 'resolve' })}>
                          Selesai
                        </Button>
                      )}
                      {t.status !== 'closed' && (
                        <Button plain onClick={() => action.mutate({ id: t.id, act: 'close' })}>
                          Tutup
                        </Button>
                      )}
                      {(t.status === 'resolved' || t.status === 'closed') && (
                        <Button plain onClick={() => action.mutate({ id: t.id, act: 'reopen' })}>
                          Buka lagi
                        </Button>
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
