'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, AdminTableEmpty, ConfirmDialog } from '@/components/admin/AdminShared'
import { levelLabel } from '@/components/features/learn/learnUtils'
import { getReviewQueue, reviewCourse } from '@/lib/api/learn'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Textarea from '@/shared/Textarea'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { CourseReviewItem } from '@/types/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

export default function AdminCourseReviewPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectSlug, setRejectSlug] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const list = useQuery({
    queryKey: ['admin', 'course-review', page],
    queryFn: () => getReviewQueue(page),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'course-review'] })
    qc.invalidateQueries({ queryKey: ['courses'] })
    qc.invalidateQueries({ queryKey: ['authored-courses'] })
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const publish = useMutation({
    mutationFn: (slug: string) => reviewCourse(slug, 'publish'),
    onSuccess: invalidate,
  })

  const reject = useMutation({
    mutationFn: ({ slug, note }: { slug: string; note: string }) => reviewCourse(slug, 'reject', note),
    onSuccess: () => {
      invalidate()
      setRejectOpen(false)
      setRejectSlug(null)
      setRejectNote('')
    },
  })

  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const pageSize = list.data?.page_size ?? 20

  return (
    <div>
      <AdminPageHeader
        title="Tinjauan Course"
        description="Verifikasi dan terbitkan course yang diajukan instruktur."
        actions={total > 0 ? <Badge color="yellow">{total} menunggu</Badge> : null}
      />

      {list.isLoading ? (
        <AdminPageSkeleton />
      ) : items.length === 0 ? (
        <AdminContentCard>
          <AdminTableEmpty>Tidak ada course yang menunggu tinjauan.</AdminTableEmpty>
        </AdminContentCard>
      ) : (
        <AdminContentCard>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader>Judul</TableHeader>
                <TableHeader>Instruktur</TableHeader>
                <TableHeader>Level</TableHeader>
                <TableHeader>Aksi</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((c: CourseReviewItem) => (
                <TableRow key={c.slug}>
                  <TableCell className="font-medium">
                    <Link href={`/learn/${c.slug}`} className="text-primary-600 hover:underline dark:text-primary-400">
                      {c.title}
                    </Link>
                  </TableCell>
                  <TableCell>{c.author?.username ?? '—'}</TableCell>
                  <TableCell>{levelLabel[c.level as keyof typeof levelLabel] ?? c.level}</TableCell>
                  <TableCell className="space-x-2">
                    <ConfirmDialog
                      label="Terbitkan"
                      confirm={`Terbitkan course "${c.title}" sebagai publikasi resmi PSD?`}
                      onConfirm={() => publish.mutate(c.slug)}
                    />
                    <Button
                      outline
                      onClick={() => {
                        setRejectSlug(c.slug)
                        setRejectNote('')
                        setRejectOpen(true)
                      }}
                    >
                      Tolak
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
        </AdminContentCard>
      )}

      {total > pageSize && (
        <div className="mt-4 flex justify-center gap-2">
          <Button outline disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <Button outline disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>
            Berikutnya
          </Button>
        </div>
      )}

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)}>
        <DialogTitle>Catatan revisi</DialogTitle>
        <DialogBody>
          <Textarea
            placeholder="Jelaskan apa yang perlu diperbaiki instruktur…"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={4}
            className="!rounded-xl"
            required
          />
        </DialogBody>
        <DialogActions>
          <Button outline type="button" onClick={() => setRejectOpen(false)}>
            Batal
          </Button>
          <Button
            color="red"
            disabled={!rejectNote.trim() || !rejectSlug || reject.isPending}
            onClick={() => rejectSlug && reject.mutate({ slug: rejectSlug, note: rejectNote.trim() })}
          >
            Tolak dengan catatan
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
