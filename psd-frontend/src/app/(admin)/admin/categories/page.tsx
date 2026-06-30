'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, ConfirmDialog } from '@/components/admin/AdminShared'
import { createCategory, deleteCategory, getCategories, updateCategory } from '@/lib/api/categories'
import type { Category } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'

const emptyForm = { name: '', description: '' }

export default function AdminCategoriesPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState(emptyForm)

  const list = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] })

  const save = useMutation({
    mutationFn: async () => {
      if (editing) return updateCategory(editing.slug, form)
      return createCategory(form)
    },
    onSuccess: () => {
      invalidate()
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
    },
  })

  const remove = useMutation({
    mutationFn: (slug: string) => deleteCategory(slug),
    onSuccess: invalidate,
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ name: c.name, description: c.description ?? '' })
    setOpen(true)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate()
  }

  return (
    <div>
      <AdminPageHeader
        title="Kategori"
        description="Kelola kategori utama. Menghapus kategori juga menghapus semua subkategorinya."
        actions={<ButtonPrimary onClick={openCreate}>Buat kategori</ButtonPrimary>}
      />

      {list.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader>Nama</TableHeader>
                <TableHeader>Slug</TableHeader>
                <TableHeader>Subkategori</TableHeader>
                <TableHeader>Aksi</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(list.data ?? []).map((c: Category) => (
                <TableRow key={c.slug}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-sm text-neutral-500">{c.slug}</TableCell>
                  <TableCell>{c.subcategory_count ?? 0}</TableCell>
                  <TableCell nowrap className="space-x-2">
                    <Button plain onClick={() => openEdit(c)}>
                      Edit
                    </Button>
                    <ConfirmDialog
                      label="Hapus"
                      danger
                      confirm={`Hapus kategori "${c.name}" beserta semua subkategorinya?`}
                      onConfirm={() => remove.mutate(c.slug)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
        </AdminContentCard>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} size="lg">
        <form onSubmit={onSubmit}>
          <DialogTitle>{editing ? 'Edit kategori' : 'Buat kategori utama'}</DialogTitle>
          <DialogBody className="space-y-4">
            <Input
              placeholder="Nama kategori"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="!rounded-xl"
            />
            <Textarea
              placeholder="Deskripsi (opsional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="!rounded-xl"
            />
          </DialogBody>
          <DialogActions>
            <Button outline type="button" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <ButtonPrimary type="submit" disabled={save.isPending}>
              {save.isPending ? 'Menyimpan...' : 'Simpan'}
            </ButtonPrimary>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}
