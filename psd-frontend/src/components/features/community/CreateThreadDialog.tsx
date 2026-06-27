'use client'

import { createThread } from '@/lib/api/community'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
}

export function CreateThreadDialog({ open, onClose }: Props) {
  const router = useRouter()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [error, setError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () =>
      createThread({
        title: title.trim(),
        body_md: body.trim(),
        tags: tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    onSuccess: (thread) => {
      qc.invalidateQueries({ queryKey: ['threads'] })
      qc.invalidateQueries({ queryKey: ['forum-stats'] })
      qc.invalidateQueries({ queryKey: ['my-quests'] })
      onClose()
      setTitle('')
      setBody('')
      setTagsRaw('')
      setError(null)
      router.push(`/forum/${thread.id}`)
    },
    onError: (e: Error) => setError(e.message),
  })

  function handleClose() {
    if (!create.isPending) onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} size="lg">
      <DialogTitle>Buka topik baru</DialogTitle>
      <DialogBody>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!title.trim()) {
              setError('Judul wajib diisi')
              return
            }
            create.mutate()
          }}
        >
          <div>
            <label htmlFor="thread-title" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Judul
            </label>
            <Input
              id="thread-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mis. Tips preprocessing teks Indonesia"
              className="!rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="thread-body" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Isi diskusi
            </label>
            <Textarea
              id="thread-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Jelaskan konteks pertanyaan atau topik yang ingin didiskusikan..."
              className="!rounded-xl font-sans text-sm"
            />
          </div>
          <div>
            <label htmlFor="thread-tags" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Tag (pisahkan koma)
            </label>
            <Input
              id="thread-tags"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="nlp, tips, pemula"
              className="!rounded-xl"
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <DialogActions>
            <Button type="button" outline onClick={handleClose} disabled={create.isPending}>
              Batal
            </Button>
            <ButtonPrimary type="submit" disabled={create.isPending}>
              {create.isPending ? 'Mempublikasikan...' : 'Publikasikan'}
            </ButtonPrimary>
          </DialogActions>
        </form>
      </DialogBody>
    </Dialog>
  )
}
