'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, AdminTableEmpty, ConfirmDialog } from '@/components/admin/AdminShared'
import {
  createAnnouncement,
  deleteAnnouncement,
  listAdminAnnouncements,
  updateAnnouncement,
} from '@/lib/api/announcements'
import { AdminAnnouncement } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { Switch } from '@/shared/switch'
import Textarea from '@/shared/Textarea'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'

const emptyForm = {
  title: '',
  body_md: '',
  level: 'info' as 'info' | 'penting',
  active: true,
}

export default function AdminAnnouncementsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdminAnnouncement | null>(null)
  const [form, setForm] = useState(emptyForm)

  const list = useQuery({ queryKey: ['admin', 'announcements'], queryFn: listAdminAnnouncements })
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'announcements'] })
    qc.invalidateQueries({ queryKey: ['announcements'] })
  }

  const save = useMutation({
    mutationFn: async () => {
      if (editing) return updateAnnouncement(editing.id, form)
      return createAnnouncement(form)
    },
    onSuccess: () => {
      invalidate()
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: invalidate,
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (a: AdminAnnouncement) => {
    setEditing(a)
    setForm({ title: a.title, body_md: a.body_md, level: a.level, active: a.active })
    setOpen(true)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate()
  }

  return (
    <div>
      <AdminPageHeader
        title="Pengumuman"
        description="Kelola banner pengumuman di beranda dan dashboard."
        actions={<ButtonPrimary onClick={openCreate}>Buat baru</ButtonPrimary>}
      />

      {list.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader>Judul</TableHeader>
                <TableHeader>Level</TableHeader>
                <TableHeader>Aktif</TableHeader>
                <TableHeader>Aksi</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(list.data ?? []).map((a: AdminAnnouncement) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>{a.level}</TableCell>
                  <TableCell>{a.active ? 'Ya' : 'Tidak'}</TableCell>
                  <TableCell nowrap className="space-x-2">
                    <Button plain onClick={() => openEdit(a)}>
                      Edit
                    </Button>
                    <ConfirmDialog
                      label="Hapus"
                      danger
                      confirm={`Hapus pengumuman "${a.title}"?`}
                      onConfirm={() => remove.mutate(a.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
        </AdminContentCard>
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit}>
          <DialogTitle>{editing ? 'Edit pengumuman' : 'Buat pengumuman'}</DialogTitle>
          <DialogBody className="space-y-4">
            <Input
              placeholder="Judul"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <Textarea
              placeholder="Isi (markdown ringkas)"
              value={form.body_md}
              onChange={(e) => setForm({ ...form, body_md: e.target.value })}
              rows={4}
              required
            />
            <Select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value as 'info' | 'penting' })}
            >
              <option value="info">Info</option>
              <option value="penting">Penting</option>
            </Select>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={form.active}
                onChange={(checked) => setForm({ ...form, active: checked })}
              />
              Aktif
            </label>
          </DialogBody>
          <DialogActions>
            <Button plain type="button" onClick={() => setOpen(false)}>
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
