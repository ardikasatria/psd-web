'use client'

import {
  AdminContentCard,
  AdminPageHeader,
  AdminPageSkeleton,
  AdminTable,
  ConfirmDialog,
} from '@/components/admin/AdminShared'
import { deleteLearningPath } from '@/lib/api/admin'
import { getLearningPaths } from '@/lib/api/learn'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { LearningPathSummary } from '@/types/api'
import { PATH_PHASES } from '@/lib/learning/pathItems'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

export default function AdminLearningPathsPage() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['admin', 'learning-paths'], queryFn: () => getLearningPaths({ page_size: 50 }) })
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'learning-paths'] })
    qc.invalidateQueries({ queryKey: ['learning-paths'] })
  }
  const remove = useMutation({ mutationFn: deleteLearningPath, onSuccess: invalidate })

  return (
    <div>
      <AdminPageHeader
        title="Jalur Belajar"
        description="Kurasi lingkaran Belajar → Buktikan → Berpeluang dari aset PSD."
        actions={
          <ButtonPrimary href="/admin/learning-paths/new">
            Buat jalur
          </ButtonPrimary>
        }
      />
      {list.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader>Jalur</TableHeader>
                <TableHeader>Lingkaran</TableHeader>
                <TableHeader>Aset</TableHeader>
                <TableHeader>Aksi</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(list.data?.items ?? []).map((p: LearningPathSummary) => (
                <TableRow key={p.slug}>
                  <TableCell>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{p.title}</p>
                    <p className="text-xs text-neutral-500">{p.slug}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {PATH_PHASES.map((phase) => {
                        const n = p.phase_counts?.[phase.key] ?? 0
                        if (!n) return null
                        return (
                          <Badge key={phase.key} color="zinc">
                            {phase.label} {n}
                          </Badge>
                        )
                      })}
                    </div>
                  </TableCell>
                  <TableCell>{p.items_count ?? p.courses_count}</TableCell>
                  <TableCell nowrap className="space-x-2">
                    <Button outline href={`/admin/learning-paths/${p.slug}`}>
                      Kurasi
                    </Button>
                    <Link href={`/paths/${p.slug}`} className="text-sm text-primary-600 hover:underline dark:text-primary-400">
                      Pratinjau
                    </Link>
                    <ConfirmDialog label="Hapus" danger confirm={`Hapus jalur "${p.title}"?`} onConfirm={() => remove.mutate(p.slug)} />
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
