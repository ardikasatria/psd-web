'use client'

import {
  AdminContentCard,
  AdminPageHeader,
  AdminPageSkeleton,
  AdminTable,
  AdminTableEmpty,
} from '@/components/admin/AdminShared'
import {
  adminListReports,
  adminResolveReport,
  adminStartReportReview,
  DECISION_LABELS,
  REASON_LABELS,
  REPORT_STATUS_LABELS,
} from '@/lib/api/reports'
import type { AdminContentReport } from '@/types/api'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

const statusColor: Record<string, 'green' | 'yellow' | 'blue' | 'zinc'> = {
  pending: 'yellow',
  reviewing: 'blue',
  resolved: 'green',
}

const KIND_LABELS: Record<string, string> = {
  post: 'Feed',
  feed: 'Feed',
  comment: 'Komentar',
  thread: 'Forum',
  reply: 'Balasan',
}

export default function AdminReportsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'flagged' | 'all'>('flagged')
  const [selected, setSelected] = useState<AdminContentReport | null>(null)
  const [decision, setDecision] = useState('dismiss')

  const list = useQuery({
    queryKey: ['admin', 'reports', tab],
    queryFn: () =>
      adminListReports({
        page_size: 50,
        ...(tab === 'flagged' ? { flagged: true } : {}),
      }),
  })

  const startReview = useMutation({
    mutationFn: (id: string) => adminStartReportReview(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  })

  const resolve = useMutation({
    mutationFn: ({ id, d }: { id: string; d: string }) => adminResolveReport(id, d),
    onSuccess: () => {
      setSelected(null)
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] })
    },
  })

  return (
    <div>
      <AdminPageHeader
        title="Moderasi Laporan"
        description="Tinjau laporan konten feed & forum. Jumlah pelapor hanya terlihat di sini."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button outline={tab !== 'flagged'} onClick={() => setTab('flagged')}>
          Flagged
        </Button>
        <Button outline={tab !== 'all'} onClick={() => setTab('all')}>
          Semua
        </Button>
      </div>

      {list.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          {(list.data?.items ?? []).length === 0 ? (
            <AdminTableEmpty>Antrian kosong.</AdminTableEmpty>
          ) : (
            <AdminTable>
              <TableHead>
                <TableRow>
                  <TableHeader className="w-[12%]">Jenis</TableHeader>
                  <TableHeader className="w-[38%]">Cuplikan</TableHeader>
                  <TableHeader className="w-[10%]" nowrap>Pelapor</TableHeader>
                  <TableHeader className="w-[12%]" nowrap>Alasan utama</TableHeader>
                  <TableHeader className="w-[10%]" nowrap>Status</TableHeader>
                  <TableHeader className="w-[18%]" nowrap>Aksi</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(list.data?.items ?? []).map((r: AdminContentReport) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      <div className="flex flex-wrap items-center gap-1">
                        {KIND_LABELS[r.kind] ?? r.kind}
                        {r.flagged && <Badge color="red">Flag</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                        {r.preview || '—'}
                      </p>
                    </TableCell>
                    <TableCell nowrap className="text-sm font-medium">
                      {r.report_count}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.top_reason ? (REASON_LABELS[r.top_reason] ?? r.top_reason) : '—'}
                    </TableCell>
                    <TableCell nowrap>
                      <Badge color={statusColor[r.status] ?? 'zinc'}>
                        {REPORT_STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell nowrap className="space-x-1">
                      {r.status === 'pending' && (
                        <Button outline onClick={() => startReview.mutate(r.id)}>
                          Review
                        </Button>
                      )}
                      {r.status !== 'resolved' && (
                        <Button onClick={() => { setSelected(r); setDecision('dismiss') }}>
                          Putuskan
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

      <Dialog open={!!selected} onClose={() => setSelected(null)} size="md">
        <DialogTitle>Keputusan moderasi</DialogTitle>
        <DialogBody className="space-y-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {selected?.preview}
          </p>
          <div className="grid gap-2">
            {Object.entries(DECISION_LABELS).map(([id, label]) => (
              <label
                key={id}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                  decision === id
                    ? 'border-primary-500 bg-primary-50 dark:border-primary-600 dark:bg-primary-950/30'
                    : 'border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <input type="radio" checked={decision === id} onChange={() => setDecision(id)} />
                {label}
              </label>
            ))}
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setSelected(null)}>Batal</Button>
          <Button
            onClick={() => selected && resolve.mutate({ id: selected.id, d: decision })}
            disabled={resolve.isPending}
          >
            {resolve.isPending ? 'Menyimpan...' : 'Terapkan'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
