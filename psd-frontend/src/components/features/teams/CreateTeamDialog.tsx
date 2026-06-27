'use client'

import { createTeam } from '@/lib/api/teams'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Select from '@/shared/Select'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
}

export function CreateTeamDialog({ open, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [error, setError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () =>
      createTeam({
        name: name.trim(),
        description: description.trim(),
        visibility,
      }),
    onSuccess: (res) => {
      onClose()
      setName('')
      setDescription('')
      setVisibility('public')
      setError(null)
      router.push(`/teams/${res.slug}`)
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <Dialog open={open} onClose={() => !create.isPending && onClose()} size="lg">
      <DialogTitle>Buat tim baru</DialogTitle>
      <DialogBody>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) {
              setError('Nama wajib diisi')
              return
            }
            create.mutate()
          }}
        >
          <div>
            <label htmlFor="team-name" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Nama tim
            </label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mis. DS Lampung"
              className="!rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="team-desc" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Deskripsi
            </label>
            <Textarea
              id="team-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="!rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="team-vis" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Visibilitas
            </label>
            <Select
              id="team-vis"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
              className="!rounded-xl"
            >
              <option value="public">Publik — siapa saja bisa minta bergabung</option>
              <option value="private">Privat — hanya undangan</option>
            </Select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogActions>
            <Button type="button" outline onClick={onClose} disabled={create.isPending}>
              Batal
            </Button>
            <ButtonPrimary type="submit" disabled={create.isPending}>
              {create.isPending ? 'Membuat…' : 'Buat tim'}
            </ButtonPrimary>
          </DialogActions>
        </form>
      </DialogBody>
    </Dialog>
  )
}
