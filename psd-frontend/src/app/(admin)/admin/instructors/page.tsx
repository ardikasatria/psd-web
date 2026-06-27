'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, AdminTableEmpty, ConfirmDialog } from '@/components/admin/AdminShared'
import { listInstructorApplications, reviewInstructorApplication } from '@/lib/api/admin'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { AdminInstructorApplication } from '@/types/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'

const statusColor: Record<string, 'green' | 'yellow' | 'red' | 'zinc'> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
}

export default function AdminInstructorsPage() {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ['admin', 'instructor-applications'],
    queryFn: () => listInstructorApplications({ page_size: 50 }),
  })

  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      reviewInstructorApplication(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'instructor-applications'] }),
  })

  return (
    <div>
      <AdminPageHeader
        title="Pengajuan Instruktur"
        description="Tinjau dan setujui pengajuan instruktur baru."
      />
      {list.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader>Pemohon</TableHeader>
                <TableHeader>Keahlian</TableHeader>
                <TableHeader>Motivasi</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Aksi</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(list.data?.items ?? []).map((app: AdminInstructorApplication) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div className="font-medium">{app.user.name}</div>
                    <div className="text-xs text-neutral-500">@{app.user.username}</div>
                  </TableCell>
                  <TableCell>{app.expertise}</TableCell>
                  <TableCell className="max-w-xs">
                    <SimpleMarkdown content={app.motivation_md.slice(0, 200) + (app.motivation_md.length > 200 ? '…' : '')} />
                  </TableCell>
                  <TableCell>
                    <Badge color={statusColor[app.status] ?? 'zinc'}>{app.status}</Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    {app.status === 'pending' && (
                      <>
                        <Button onClick={() => review.mutate({ id: app.id, status: 'approved' })}>
                          Setujui
                        </Button>
                        <ConfirmDialog
                          label="Tolak"
                          danger
                          confirm={`Tolak pengajuan dari ${app.user.name}?`}
                          onConfirm={() => review.mutate({ id: app.id, status: 'rejected' })}
                        />
                      </>
                    )}
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
