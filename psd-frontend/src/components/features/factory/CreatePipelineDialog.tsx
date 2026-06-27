'use client'

import { createPipeline } from '@/lib/api/factory'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
}

export function CreatePipelineDialog({ open, onClose }: Props) {
  const router = useRouter()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => createPipeline({ title: title.trim() }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['factory-pipelines'] })
      onClose()
      router.push(`/factory/pipelines/${res.slug}`)
    },
    onError: (e: Error) => setError(e.message),
  })

  function handleClose() {
    setTitle('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} size="md">
      <DialogTitle>Pipeline baru</DialogTitle>
      <DialogBody className="space-y-4">
        <Field>
          <Label>Judul pipeline</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ETL Ulasan Marketplace Bersih"
          />
        </Field>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </DialogBody>
      <DialogActions>
        <Button type="button" plain onClick={handleClose}>
          Batal
        </Button>
        <ButtonPrimary
          type="button"
          disabled={!title.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Membuat…' : 'Buat pipeline'}
        </ButtonPrimary>
      </DialogActions>
    </Dialog>
  )
}
