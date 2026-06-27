'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable } from '@/components/admin/AdminShared'
import { createQuest, getQuestCatalog, getMyQuests, updateQuest } from '@/lib/api/quests'
import type { Quest, QuestStep, QuestSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Select from '@/shared/Select'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'

const STEP_TYPES = [
  'complete_profile',
  'complete_course',
  'complete_path',
  'enroll_course',
  'submit_competition',
  'publish_asset',
  'create_notebook',
  'make_post',
  'follow_user',
  'reach_reputation',
] as const

type StepForm = { id: string; title: string; type: string; target: string; description: string }

const emptyStep = (): StepForm => ({ id: '', title: '', type: 'complete_profile', target: '', description: '' })

type QuestForm = {
  slug: string
  title: string
  description: string
  reward_reputation: number
  reward_badge: string
  active: boolean
  steps: StepForm[]
}

const emptyForm = (): QuestForm => ({
  slug: '',
  title: '',
  description: '',
  reward_reputation: 0,
  reward_badge: '',
  active: true,
  steps: [emptyStep()],
})

function questToForm(q: Quest): QuestForm {
  return {
    slug: q.slug,
    title: q.title,
    description: q.description,
    reward_reputation: q.reward_reputation,
    reward_badge: q.reward_badge ?? '',
    active: true,
    steps: q.steps.map((s) => ({
      id: s.id,
      title: s.title,
      type: s.type,
      target: s.target != null ? String(s.target) : '',
      description: s.description ?? '',
    })),
  }
}

function formToBody(form: QuestForm, isEdit: boolean) {
  const steps: QuestStep[] = form.steps
    .filter((s) => s.title.trim())
    .map((s, i) => ({
      id: s.id.trim() || `step-${i + 1}`,
      title: s.title.trim(),
      type: s.type,
      target: s.target.trim() ? (Number.isNaN(Number(s.target)) ? s.target.trim() : Number(s.target)) : null,
      description: s.description.trim() || undefined,
    }))
  const body: Record<string, unknown> = {
    title: form.title.trim(),
    description: form.description.trim(),
    steps,
    reward_reputation: form.reward_reputation,
    reward_badge: form.reward_badge.trim() || null,
    active: form.active,
  }
  if (!isEdit) body.slug = form.slug.trim()
  return body
}

export default function AdminQuestsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<QuestForm>(emptyForm())

  const catalog = useQuery({ queryKey: ['quests', 'catalog'], queryFn: getQuestCatalog })
  const mine = useQuery({ queryKey: ['me', 'quests'], queryFn: getMyQuests })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['quests'] })
    qc.invalidateQueries({ queryKey: ['me', 'quests'] })
  }

  const save = useMutation({
    mutationFn: async () => {
      const body = formToBody(form, !!editing)
      if (editing) return updateQuest(editing, body)
      return createQuest(body)
    },
    onSuccess: () => {
      invalidate()
      setOpen(false)
      setEditing(null)
      setForm(emptyForm())
    },
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setOpen(true)
  }

  const openEdit = (slug: string) => {
    const full = mine.data?.items.find((q: Quest) => q.slug === slug)
    if (!full) return
    setEditing(slug)
    setForm(questToForm(full))
    setOpen(true)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate()
  }

  const updateStep = (idx: number, patch: Partial<StepForm>) => {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }))
  }

  return (
    <div>
      <AdminPageHeader
        title="Quest"
        description="Kelola quest lingkaran terpandu — langkah, hadiah reputasi, dan badge."
        actions={<ButtonPrimary onClick={openCreate}>Buat quest</ButtonPrimary>}
      />

      {catalog.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader>Judul</TableHeader>
                <TableHeader>Slug</TableHeader>
                <TableHeader>Langkah</TableHeader>
                <TableHeader>Reputasi</TableHeader>
                <TableHeader>Aksi</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(catalog.data ?? []).map((q: QuestSummary) => (
                <TableRow key={q.slug}>
                  <TableCell className="font-medium">{q.title}</TableCell>
                  <TableCell className="font-mono text-sm text-neutral-500">{q.slug}</TableCell>
                  <TableCell>{q.steps_count ?? '—'}</TableCell>
                  <TableCell>+{q.reward_reputation}</TableCell>
                  <TableCell>
                    <Button plain onClick={() => openEdit(q.slug)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
        </AdminContentCard>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} size="3xl">
        <form onSubmit={onSubmit}>
          <DialogTitle>{editing ? 'Edit quest' : 'Buat quest baru'}</DialogTitle>
          <DialogBody className="max-h-[70vh] space-y-4 overflow-y-auto">
            {!editing && (
              <Input
                placeholder="Slug (mis. mulai-perjalanan)"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                required
                className="!rounded-xl font-mono"
              />
            )}
            <Input
              placeholder="Judul quest"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="!rounded-xl"
            />
            <Textarea
              placeholder="Deskripsi"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="!rounded-xl"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="number"
                placeholder="Hadiah reputasi"
                value={form.reward_reputation}
                onChange={(e) => setForm({ ...form, reward_reputation: Number(e.target.value) })}
                className="!rounded-xl"
              />
              <Input
                placeholder="Badge (opsional)"
                value={form.reward_badge}
                onChange={(e) => setForm({ ...form, reward_badge: e.target.value })}
                className="!rounded-xl"
              />
            </div>

            <div className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Langkah</p>
                <Button type="button" outline onClick={() => setForm({ ...form, steps: [...form.steps, emptyStep()] })}>
                  + Langkah
                </Button>
              </div>
              {form.steps.map((step, idx) => (
                <div key={idx} className="space-y-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="ID langkah"
                      value={step.id}
                      onChange={(e) => updateStep(idx, { id: e.target.value })}
                      className="!rounded-lg text-sm"
                    />
                    <Select
                      value={step.type}
                      onChange={(e) => updateStep(idx, { type: e.target.value })}
                      className="!rounded-lg text-sm"
                    >
                      {STEP_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Input
                    placeholder="Judul langkah"
                    value={step.title}
                    onChange={(e) => updateStep(idx, { title: e.target.value })}
                    className="!rounded-lg text-sm"
                  />
                  <Input
                    placeholder="Target (slug course/path, angka reputasi, dll.)"
                    value={step.target}
                    onChange={(e) => updateStep(idx, { target: e.target.value })}
                    className="!rounded-lg text-sm font-mono"
                  />
                  <Textarea
                    placeholder="Deskripsi langkah"
                    value={step.description}
                    onChange={(e) => updateStep(idx, { description: e.target.value })}
                    rows={2}
                    className="!rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
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
