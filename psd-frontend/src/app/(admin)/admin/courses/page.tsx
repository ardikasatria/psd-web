'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, AdminTableEmpty, ConfirmDialog } from '@/components/admin/AdminShared'
import { createCourse, deleteCourse, updateCourse } from '@/lib/api/admin'
import { getCourses } from '@/lib/api/learn'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { CourseSummary } from '@/types/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'

const emptyForm = { slug: '', title: '', level: 'pemula', description: '' }

export default function AdminCoursesPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CourseSummary | null>(null)
  const [form, setForm] = useState(emptyForm)

  const list = useQuery({ queryKey: ['admin', 'courses'], queryFn: () => getCourses({ page_size: 50 }) })
  const invalidate = () => { qc.invalidateQueries({ queryKey: ['admin', 'courses'] }); qc.invalidateQueries({ queryKey: ['courses'] }) }

  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, cover_url: null, modules: [] }
      if (editing) return updateCourse(editing.slug, body)
      return createCourse(body)
    },
    onSuccess: () => { invalidate(); setOpen(false); setEditing(null); setForm(emptyForm) },
  })
  const remove = useMutation({ mutationFn: deleteCourse, onSuccess: invalidate })

  return (
    <div>
      <AdminPageHeader title="Course" description="Kelola kursus belajar." actions={<ButtonPrimary onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}>Buat baru</ButtonPrimary>} />
      {list.isLoading ? <AdminPageSkeleton /> : (
        <AdminContentCard>
          <AdminTable>
            <TableHead><TableRow><TableHeader>Judul</TableHeader><TableHeader>Level</TableHeader><TableHeader>Status</TableHeader><TableHeader>Instruktur</TableHeader><TableHeader>Pelajaran</TableHeader><TableHeader>Aksi</TableHeader></TableRow></TableHead>
            <TableBody>
              {(list.data?.items ?? []).map((c: CourseSummary) => (
                <TableRow key={c.slug}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>{c.level}</TableCell>
                  <TableCell>{c.status ?? 'published'}</TableCell>
                  <TableCell>{c.author?.username ?? '—'}</TableCell>
                  <TableCell>{c.lessons_count}</TableCell>
                  <TableCell className="space-x-2">
                    <Button outline onClick={() => { setEditing(c); setForm({ slug: c.slug, title: c.title, level: c.level, description: '' }); setOpen(true) }}>Edit</Button>
                    <ConfirmDialog label="Hapus" danger confirm={`Hapus kursus "${c.title}"?`} onConfirm={() => remove.mutate(c.slug)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
        </AdminContentCard>
      )}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate() }}>
          <DialogTitle>{editing ? 'Edit kursus' : 'Buat kursus'}</DialogTitle>
          <DialogBody className="space-y-4">
            <Input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required disabled={!!editing} className="!rounded-xl" />
            <Input placeholder="Judul" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="!rounded-xl" />
            <Input placeholder="Level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="!rounded-xl" />
            <Textarea placeholder="Deskripsi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="!rounded-xl" />
          </DialogBody>
          <DialogActions>
            <Button outline type="button" onClick={() => setOpen(false)}>Batal</Button>
            <ButtonPrimary type="submit" disabled={save.isPending}>Simpan</ButtonPrimary>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}
