'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { updateRepo } from '@/lib/api/repos'
import type { RepoDetail, UpdateRepoBody } from '@/types/api'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/shared/dialog'
import { Button } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Select from '@/shared/Select'

const LICENSES = ['MIT', 'Apache-2.0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'GPL-3.0', 'Proprietary']

interface RepoEditDialogProps {
  repo: RepoDetail
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function RepoEditDialog({ repo, open, onClose, onSaved }: RepoEditDialogProps) {
  const [description, setDescription] = useState(repo.description)
  const [tags, setTags] = useState(repo.tags.join(', '))
  const [license, setLicense] = useState(repo.license ?? '')
  const [visibility, setVisibility] = useState<'public' | 'private'>(repo.visibility)
  const [readmeMd, setReadmeMd] = useState(repo.readme_md)
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () => {
      const body: UpdateRepoBody = {
        description,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        license: license || null,
        visibility,
        readme_md: readmeMd,
      }
      return updateRepo(repo.id, body)
    },
    onSuccess: () => {
      setError(null)
      onSaved()
      onClose()
    },
    onError: () => setError('Gagal menyimpan perubahan.'),
  })

  return (
    <Dialog open={open} onClose={onClose} size="2xl">
      <DialogTitle>Edit aset</DialogTitle>
      <DialogDescription>Perbarui metadata dan README aset Anda.</DialogDescription>
      <DialogBody>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <Field>
            <Label>Deskripsi</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 !rounded-xl" />
          </Field>
          <Field>
            <Label>Tags (pisahkan koma)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 !rounded-xl" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label>Lisensi</Label>
              <Select value={license} onChange={(e) => setLicense(e.target.value)} className="mt-1 !rounded-xl">
                <option value="">— Pilih —</option>
                {LICENSES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label>Visibilitas</Label>
              <Select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                className="mt-1 !rounded-xl"
              >
                <option value="public">Publik</option>
                <option value="private">Privat</option>
              </Select>
            </Field>
          </div>
          <Field>
            <Label>README (markdown)</Label>
            <Textarea value={readmeMd} onChange={(e) => setReadmeMd(e.target.value)} rows={8} className="mt-1 !rounded-xl font-mono text-sm" />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogActions>
            <Button type="button" outline onClick={onClose}>
              Batal
            </Button>
            <ButtonPrimary type="submit" disabled={save.isPending}>
              {save.isPending ? 'Menyimpan...' : 'Simpan'}
            </ButtonPrimary>
          </DialogActions>
        </form>
      </DialogBody>
    </Dialog>
  )
}
