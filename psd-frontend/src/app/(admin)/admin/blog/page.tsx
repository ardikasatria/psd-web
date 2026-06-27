'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, AdminTableEmpty, ConfirmDialog } from '@/components/admin/AdminShared'
import { deleteArticle, getBlog } from '@/lib/api/blog'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import type { BlogSummary } from '@/types/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminBlogPage() {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ['admin', 'blog'],
    queryFn: () => getBlog({ status: 'all', page_size: 50 }),
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'blog'] })

  const remove = useMutation({
    mutationFn: (slug: string) => deleteArticle(slug),
    onSuccess: invalidate,
  })

  return (
    <div>
      <AdminPageHeader
        title="Blog"
        description="Kelola berita dan artikel informasi PSD."
        actions={
          <ButtonPrimary href="/admin/blog/new">Tulis artikel</ButtonPrimary>
        }
      />

      {list.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader>Judul</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Terbit</TableHeader>
                <TableHeader>Aksi</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(list.data?.items ?? []).map((a: BlogSummary) => (
                <TableRow key={a.slug}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-xs text-neutral-500">/blog/{a.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color={a.status === 'published' ? 'green' : 'amber'}>
                      {a.status === 'published' ? 'Terbit' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">{formatDate(a.published_at)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/blog/${a.slug}/edit`}
                        className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                      >
                        Edit
                      </Link>
                      {a.status === 'published' && (
                        <Link
                          href={`/blog/${a.slug}`}
                          className="text-sm text-neutral-500 hover:underline"
                          target="_blank"
                        >
                          Lihat
                        </Link>
                      )}
                      <ConfirmDialog
                        label="Hapus"
                        danger
                        confirm={`Hapus artikel "${a.title}"?`}
                        onConfirm={() => remove.mutate(a.slug)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
          {!list.data?.items.length && (
            <p className="p-8 text-center text-sm text-neutral-500">Belum ada artikel.</p>
          )}
        </AdminContentCard>
      )}
    </div>
  )
}
