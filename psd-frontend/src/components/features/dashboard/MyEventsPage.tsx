'use client'

import { EmptyCTA } from '@/components/dashboard/EmptyCTA'
import { MyEventRow } from '@/components/dashboard/rows/MyEventRow'
import { QueryState } from '@/components/features/QueryState'
import { EventProposalForm } from '@/components/features/events/EventProposalForm'
import {
  eventProposalFormToBody,
  eventProposalStatusColor,
  eventProposalStatusLabel,
  toDatetimeLocal,
  type EventProposalFormState,
} from '@/components/features/events/event-proposal-utils'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import {
  createEventProposal,
  listMyEventProposals,
  submitEventProposal,
  updateEventProposal,
} from '@/lib/api/events'
import { getMyEvents } from '@/lib/api/me'
import type { EventProposal, MyEventRegistration, PaginatedMyEventRegistration } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Dialog, DialogBody, DialogTitle } from '@/shared/dialog'
import clsx from 'clsx'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

type Tab = 'registrations' | 'manage'

export function MyEventsPage() {
  useAuthGuard('/dashboard/events')

  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('registrations')
  const [proposalOpen, setProposalOpen] = useState(false)
  const [editingProposal, setEditingProposal] = useState<EventProposal | null>(null)
  const [categorySlug, setCategorySlug] = useState<string | null>(null)
  const [subcategorySlug, setSubcategorySlug] = useState<string | null>(null)

  const registrations = useQuery<PaginatedMyEventRegistration>({
    queryKey: ['my-events'],
    queryFn: () => getMyEvents({ page_size: 50 }),
  })

  const proposals = useQuery({
    queryKey: ['my-event-proposals'],
    queryFn: () => listMyEventProposals(),
  })

  const saveProposal = useMutation({
    mutationFn: async ({ form, submit }: { form: EventProposalFormState; submit: boolean }) => {
      const body = eventProposalFormToBody(form, categorySlug, subcategorySlug, submit)
      if (editingProposal) {
        await updateEventProposal(editingProposal.id, body)
        if (submit && editingProposal.status !== 'pending_review') {
          await submitEventProposal(editingProposal.id)
        }
        return
      }
      await createEventProposal(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-event-proposals'] })
      setProposalOpen(false)
      setEditingProposal(null)
      setTab('manage')
    },
  })

  const submitExisting = useMutation({
    mutationFn: (id: string) => submitEventProposal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-event-proposals'] }),
  })

  const tabs: { id: Tab; label: string }[] = [
    { id: 'registrations', label: 'Pendaftaran saya' },
    { id: 'manage', label: 'Kelola event' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Event saya</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Daftar event yang Anda ikuti, atau ajukan event baru untuk ditinjau tim humas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonPrimary href="/events" outline>
            Jelajahi event
          </ButtonPrimary>
          <ButtonPrimary onClick={() => { setEditingProposal(null); setCategorySlug(null); setSubcategorySlug(null); setProposalOpen(true) }}>
            Ajukan event
          </ButtonPrimary>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-1 dark:border-neutral-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              'rounded-t-lg px-4 py-2 text-sm font-medium',
              tab === t.id ? 'border-b-2 border-primary-600 text-primary-700 dark:text-primary-300' : 'text-neutral-500',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'registrations' && (
        <QueryState isLoading={registrations.isLoading} isError={registrations.isError} error={registrations.error}>
          {registrations.data?.items.length ? (
            <div className="space-y-3">
              {registrations.data.items.map((r: MyEventRegistration) => (
                <MyEventRow key={r.registration_id} registration={r} />
              ))}
            </div>
          ) : (
            !registrations.isLoading && !registrations.isError && (
              <EmptyCTA text="Anda belum terdaftar di event mana pun." href="/events" cta="Jelajahi event" />
            )
          )}
        </QueryState>
      )}

      {tab === 'manage' && (
        <QueryState isLoading={proposals.isLoading} isError={proposals.isError} error={proposals.error}>
          <div className="mb-4 rounded-2xl border border-primary-100 bg-primary-50/50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-800/60">
            <p className="font-medium">Alur pengajuan event</p>
            <ol className="mt-2 list-decimal space-y-1 ps-5 text-neutral-600 dark:text-neutral-400">
              <li>Isi detail event, unggah banner & foto carousel.</li>
              <li>Kirim ke tim humas untuk verifikasi.</li>
              <li>Setelah disetujui, event tampil di halaman publik.</li>
            </ol>
          </div>

          {(proposals.data?.items ?? []).length ? (
            <div className="space-y-3">
              {(proposals.data?.items ?? []).map((p: EventProposal) => (
                <div key={p.id} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{p.title}</h3>
                        <Badge color={eventProposalStatusColor[p.status]}>{eventProposalStatusLabel[p.status]}</Badge>
                      </div>
                      {p.review_note && (
                        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                          Catatan humas: {p.review_note}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p.event_slug && <Button outline href={`/events/${p.event_slug}`}>Lihat event</Button>}
                      {['draft', 'revision_requested'].includes(p.status) && (
                        <>
                          <Button outline onClick={() => { setEditingProposal(p); setCategorySlug(p.category?.slug ?? null); setSubcategorySlug(p.subcategory?.slug ?? null); setProposalOpen(true) }}>
                            Edit
                          </Button>
                          {p.status === 'draft' && (
                            <ButtonPrimary onClick={() => submitExisting.mutate(p.id)} disabled={submitExisting.isPending}>
                              Kirim ke humas
                            </ButtonPrimary>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !proposals.isLoading && (
              <div className="rounded-2xl border border-dashed px-6 py-10 text-center">
                <p className="text-sm text-neutral-600">Belum ada pengajuan event.</p>
                <ButtonPrimary className="mt-4" onClick={() => setProposalOpen(true)}>Ajukan event pertama</ButtonPrimary>
              </div>
            )
          )}
        </QueryState>
      )}

      <Dialog open={proposalOpen} onClose={() => setProposalOpen(false)} size="3xl">
        <DialogTitle>{editingProposal ? 'Edit pengajuan event' : 'Ajukan event baru'}</DialogTitle>
        <DialogBody className="max-h-[75vh] overflow-y-auto">
          <EventProposalForm
            initial={
              editingProposal
                ? {
                    proposed_slug: editingProposal.proposed_slug,
                    title: editingProposal.title,
                    type: editingProposal.type,
                    mode: editingProposal.mode,
                    starts_at: toDatetimeLocal(editingProposal.starts_at),
                    ends_at: toDatetimeLocal(editingProposal.ends_at),
                    location: editingProposal.location ?? '',
                    capacity: editingProposal.capacity?.toString() ?? '',
                    description_md: editingProposal.description_md,
                    cover_url: editingProposal.cover_url ?? null,
                    gallery_urls: editingProposal.gallery_urls ?? [],
                  }
                : undefined
            }
            categorySlug={categorySlug}
            subcategorySlug={subcategorySlug}
            onCategoryChange={(cat, sub) => { setCategorySlug(cat); setSubcategorySlug(sub) }}
            pending={saveProposal.isPending}
            onSubmit={(form, submit) => saveProposal.mutateAsync({ form, submit })}
          />
        </DialogBody>
      </Dialog>
    </div>
  )
}
