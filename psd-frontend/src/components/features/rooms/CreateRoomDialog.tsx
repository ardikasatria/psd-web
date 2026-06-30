'use client'

import { CategoryPicker } from '@/components/common/CategoryPicker'
import { RoomCoverField } from '@/components/features/rooms/RoomCoverField'
import { createRoom, uploadRoomCover } from '@/lib/api/rooms'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Select from '@/shared/Select'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Field, Label } from '@/shared/fieldset'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  teamId?: string | null
}

function resetForm(
  setters: {
    setTitle: (v: string) => void
    setPitchMd: (v: string) => void
    setMaxMembers: (v: string) => void
    setVisibility: (v: 'public' | 'private') => void
    setCategorySlug: (v: string | null) => void
    setSubcategorySlug: (v: string | null) => void
    setCoverPreview: (v: string | null) => void
    setCoverFile: (v: File | null) => void
    setError: (v: string | null) => void
  },
) {
  setters.setTitle('')
  setters.setPitchMd('')
  setters.setMaxMembers('')
  setters.setVisibility('public')
  setters.setCategorySlug(null)
  setters.setSubcategorySlug(null)
  setters.setCoverPreview(null)
  setters.setCoverFile(null)
  setters.setError(null)
}

export function CreateRoomDialog({ open, onClose, teamId }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [pitchMd, setPitchMd] = useState('')
  const [maxMembers, setMaxMembers] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [categorySlug, setCategorySlug] = useState<string | null>(null)
  const [subcategorySlug, setSubcategorySlug] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: async () => {
      let cover_url: string | null = null
      if (coverFile) {
        const uploaded = await uploadRoomCover(coverFile)
        cover_url = uploaded.cover_url
      }
      return createRoom({
        title: title.trim(),
        pitch_md: pitchMd.trim(),
        cover_url,
        category: categorySlug,
        subcategory: subcategorySlug,
        max_members: maxMembers ? Number(maxMembers) : null,
        visibility,
        team_id: teamId || undefined,
      })
    },
    onSuccess: (res) => {
      resetForm({
        setTitle,
        setPitchMd,
        setMaxMembers,
        setVisibility,
        setCategorySlug,
        setSubcategorySlug,
        setCoverPreview,
        setCoverFile,
        setError,
      })
      onClose()
      router.push(`/idea-rooms/${res.slug}`)
    },
    onError: (e: Error) => setError(e.message),
  })

  const handleClose = () => {
    if (create.isPending) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} size="lg">
      <DialogTitle>Ajukan ide baru</DialogTitle>
      <DialogBody>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          Ruang ide otomatis membuat tim kolaborasi. Anda menjadi master (owner) dan dapat mengundang rekan
          setelah ruang diterbitkan.
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!title.trim()) {
              setError('Judul wajib diisi')
              return
            }
            setError(null)
            create.mutate()
          }}
        >
          <RoomCoverField
            previewUrl={coverPreview}
            onPreviewChange={setCoverPreview}
            onFileChange={setCoverFile}
            disabled={create.isPending}
          />

          <Field>
            <Label>Judul ide</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Prediksi permintaan UMKM berbasis cuaca"
              className="!rounded-xl"
            />
          </Field>
          <Field>
            <Label>Pitch (markdown)</Label>
            <Textarea
              value={pitchMd}
              onChange={(e) => setPitchMd(e.target.value)}
              rows={4}
              placeholder="Jelaskan masalah, siapa yang terdampak, dan mengapa ini penting..."
              className="!rounded-xl"
            />
          </Field>
          <CategoryPicker
            categorySlug={categorySlug}
            subcategorySlug={subcategorySlug}
            onChange={(cat, sub) => {
              setCategorySlug(cat)
              setSubcategorySlug(sub)
            }}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label>Batas anggota (opsional)</Label>
              <Input
                type="number"
                min={2}
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                placeholder="Kosongkan = tak terbatas"
                className="!rounded-xl"
              />
            </Field>
            <Field>
              <Label>Visibilitas</Label>
              <Select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                className="!rounded-xl"
              >
                <option value="public">Publik</option>
                <option value="private">Privat</option>
              </Select>
            </Field>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogActions>
            <Button type="button" outline onClick={handleClose} disabled={create.isPending}>
              Batal
            </Button>
            <ButtonPrimary type="submit" disabled={create.isPending}>
              {create.isPending ? 'Membuat…' : 'Buat ruang ide'}
            </ButtonPrimary>
          </DialogActions>
        </form>
      </DialogBody>
    </Dialog>
  )
}
