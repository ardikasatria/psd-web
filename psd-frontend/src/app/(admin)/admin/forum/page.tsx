'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, AdminTableEmpty, ConfirmDialog } from '@/components/admin/AdminShared'
import { deleteAdminThread } from '@/lib/api/admin'
import { getThreads } from '@/lib/api/community'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { ThreadSummary } from '@/types/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

export default function AdminForumPage() {
  const qc = useQueryClient()
  const threads = useQuery({ queryKey: ['admin', 'forum'], queryFn: () => getThreads({ page_size: 50 }) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'forum'] })

  const remove = useMutation({
    mutationFn: (id: string) => deleteAdminThread(id),
    onSuccess: invalidate,
  })

  return (
    <div>
      <AdminPageHeader title="Forum" description="Moderasi utas diskusi umum." />
      {threads.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader>Judul</TableHeader>
                <TableHeader>Penulis</TableHeader>
                <TableHeader>Balasan</TableHeader>
                <TableHeader>Aksi</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(threads.data?.items ?? []).map((t: ThreadSummary) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link href={`/forum/${t.id}`} className="font-medium text-primary-600 hover:underline">
                      {t.title}
                    </Link>
                  </TableCell>
                  <TableCell>{t.author.username}</TableCell>
                  <TableCell>{t.replies}</TableCell>
                  <TableCell>
                    <ConfirmDialog
                      label="Hapus"
                      danger
                      confirm={`Hapus utas "${t.title}"? Tindakan ini permanen.`}
                      onConfirm={() => remove.mutate(t.id)}
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
