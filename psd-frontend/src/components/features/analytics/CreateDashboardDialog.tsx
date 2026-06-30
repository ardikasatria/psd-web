'use client'

import { createDashboard } from '@/lib/api/dashboards'
import { listPipelines } from '@/lib/api/factory'
import { getMyTeams } from '@/lib/api/teams'
import type { PipelineSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const selectClass =
  'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100'

type Props = {
  open: boolean
  onClose: () => void
  defaultPipelineId?: string | null
  defaultTeamId?: string | null
}

export function CreateDashboardDialog({ open, onClose, defaultPipelineId, defaultTeamId }: Props) {
  const router = useRouter()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pipelineId, setPipelineId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [error, setError] = useState<string | null>(null)

  const pipelines = useQuery({
    queryKey: ['factory-pipelines', 'dashboard-create'],
    queryFn: () => listPipelines({ page: 1 }),
    enabled: open,
  })

  const teams = useQuery({
    queryKey: ['my-teams', 'dashboard-create'],
    queryFn: getMyTeams,
    enabled: open,
  })

  useEffect(() => {
    if (open && defaultPipelineId) setPipelineId(defaultPipelineId)
    if (open && defaultTeamId) setTeamId(defaultTeamId)
  }, [open, defaultPipelineId, defaultTeamId])

  const mutation = useMutation({
    mutationFn: () =>
      createDashboard({
        title: title.trim(),
        description_md: description.trim(),
        pipeline_id: pipelineId || null,
        team_id: teamId || null,
        visibility,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['analytics-dashboards'] })
      handleClose()
      router.push(`/analytics/${res.slug}`)
    },
    onError: (e: Error) => setError(e.message),
  })

  function handleClose() {
    setTitle('')
    setDescription('')
    setPipelineId(defaultPipelineId ?? '')
    setTeamId('')
    setVisibility('private')
    setError(null)
    onClose()
  }

  const pipelineItems = pipelines.data?.items ?? []
  const teamItems = (teams.data?.items ?? []) as { id: string; name: string }[]

  return (
    <Dialog open={open} onClose={handleClose} size="md">
      <DialogTitle>Dashboard baru</DialogTitle>
      <DialogBody className="space-y-4">
        <Field>
          <Label>Judul dashboard</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dashboard Ulasan Gold" />
        </Field>
        <Field>
          <Label>Deskripsi (opsional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Visualisasi lapisan gold dari pipeline…"
          />
        </Field>
        <Field>
          <Label>Pipeline sumber gold (opsional)</Label>
          <select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} className={selectClass}>
            <option value="">— Tanpa pipeline —</option>
            {pipelineItems.map((p: PipelineSummary) => (
              <option key={p.slug} value={p.id ?? ''}>
                {p.title} ({p.status})
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <Label>Tim (opsional)</Label>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={selectClass}>
            <option value="">— Tanpa tim —</option>
            {teamItems.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <Label>Visibilitas awal</Label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'private' | 'public')}
            className={selectClass}
          >
            <option value="private">Privat</option>
            <option value="public">Publik</option>
          </select>
        </Field>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </DialogBody>
      <DialogActions>
        <Button type="button" plain onClick={handleClose}>
          Batal
        </Button>
        <ButtonPrimary type="button" disabled={!title.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Membuat…' : 'Buat dashboard'}
        </ButtonPrimary>
      </DialogActions>
    </Dialog>
  )
}
