'use client'

import { EmptyCTA } from '@/components/dashboard/EmptyCTA'
import { SubmissionRow } from '@/components/dashboard/rows/SubmissionRow'
import { QueryState } from '@/components/features/QueryState'
import { CompetitionProposalForm } from '@/components/features/competitions/CompetitionProposalForm'
import {
  proposalFormToBody,
  proposalStatusColor,
  proposalStatusLabel,
  toDatetimeLocal,
  type ProposalFormState,
} from '@/components/features/competitions/competition-proposal-utils'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import {
  createCompetitionProposal,
  listMyCompetitionProposals,
  submitCompetitionProposal,
  updateCompetitionProposal,
} from '@/lib/api/competitions'
import { getMySubmissions } from '@/lib/api/me'
import type { CompetitionProposal, MySubmission, PaginatedMySubmission } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Dialog, DialogBody, DialogTitle } from '@/shared/dialog'
import clsx from 'clsx'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

type Tab = 'participation' | 'manage'

export function MyCompetitionsPage() {
  useAuthGuard('/dashboard/competitions')

  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('participation')
  const [proposalOpen, setProposalOpen] = useState(false)
  const [editingProposal, setEditingProposal] = useState<CompetitionProposal | null>(null)
  const [categorySlug, setCategorySlug] = useState<string | null>(null)
  const [subcategorySlug, setSubcategorySlug] = useState<string | null>(null)

  const submissions = useQuery<PaginatedMySubmission>({
    queryKey: ['my-submissions'],
    queryFn: () => getMySubmissions({ page_size: 50 }),
  })

  const proposals = useQuery({
    queryKey: ['my-competition-proposals'],
    queryFn: () => listMyCompetitionProposals(),
  })

  const saveProposal = useMutation({
    mutationFn: async ({ form, submit }: { form: ProposalFormState; submit: boolean }) => {
      const body = proposalFormToBody(form, categorySlug, subcategorySlug, submit)
      if (editingProposal) {
        await updateCompetitionProposal(editingProposal.id, body)
        if (submit && editingProposal.status !== 'pending_review') {
          await submitCompetitionProposal(editingProposal.id)
        }
        return
      }
      await createCompetitionProposal(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-competition-proposals'] })
      setProposalOpen(false)
      setEditingProposal(null)
      setTab('manage')
    },
  })

  const submitExisting = useMutation({
    mutationFn: (id: string) => submitCompetitionProposal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-competition-proposals'] }),
  })

  const openCreateProposal = () => {
    setEditingProposal(null)
    setCategorySlug(null)
    setSubcategorySlug(null)
    setProposalOpen(true)
  }

  const openEditProposal = (p: CompetitionProposal) => {
    setEditingProposal(p)
    setCategorySlug(p.category?.slug ?? null)
    setSubcategorySlug(p.subcategory?.slug ?? null)
    setProposalOpen(true)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'participation', label: 'Partisipasi saya' },
    { id: 'manage', label: 'Kelola kompetisi' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Kompetisi saya</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Ikuti kompetisi yang ada atau ajukan kompetisi baru untuk ditinjau tim humas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonPrimary outline href="/competitions">
            Jelajahi kompetisi
          </ButtonPrimary>
          <ButtonPrimary onClick={openCreateProposal}>Ajukan kompetisi</ButtonPrimary>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-1 dark:border-neutral-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              'rounded-t-lg px-4 py-2 text-sm font-medium transition',
              tab === t.id
                ? 'border-b-2 border-primary-600 text-primary-700 dark:text-primary-300'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'participation' && (
        <QueryState isLoading={submissions.isLoading} isError={submissions.isError} error={submissions.error}>
          {submissions.data?.items.length ? (
            <div className="space-y-3">
              {submissions.data.items.map((s: MySubmission) => (
                <SubmissionRow key={s.id} submission={s} />
              ))}
            </div>
          ) : (
            !submissions.isLoading &&
            !submissions.isError && (
              <EmptyCTA text="Belum ada submission. Ikuti kompetisi pertama." href="/competitions" cta="Ikuti kompetisi" />
            )
          )}
        </QueryState>
      )}

      {tab === 'manage' && (
        <QueryState isLoading={proposals.isLoading} isError={proposals.isError} error={proposals.error}>
          <div className="mb-4 rounded-2xl border border-primary-100 bg-primary-50/50 p-4 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">Alur pengajuan kompetisi</p>
            <ol className="mt-2 list-decimal space-y-1 ps-5">
              <li>Isi formulir pengajuan (judul, banner, aturan, dataset).</li>
              <li>Kirim ke tim humas — status menjadi <strong>Menunggu tinjauan</strong>.</li>
              <li>Humas menyetujui (kompetisi dipublikasikan), minta revisi, atau menolak.</li>
            </ol>
          </div>

          {(proposals.data?.items ?? []).length ? (
            <div className="space-y-3">
              {(proposals.data?.items ?? []).map((p: CompetitionProposal) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{p.title}</h3>
                        <Badge color={proposalStatusColor[p.status]}>{proposalStatusLabel[p.status]}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-neutral-500">/{p.proposed_slug}</p>
                      {p.review_note && (
                        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                          Catatan humas: {p.review_note}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p.competition_slug && (
                        <Button outline href={`/competitions/${p.competition_slug}`}>
                          Lihat kompetisi
                        </Button>
                      )}
                      {['draft', 'revision_requested'].includes(p.status) && (
                        <>
                          <Button outline onClick={() => openEditProposal(p)}>
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
            !proposals.isLoading &&
            !proposals.isError && (
              <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center dark:border-neutral-600">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Belum ada pengajuan kompetisi. Ajukan ide kompetisi pertama Anda.
                </p>
                <ButtonPrimary className="mt-4" onClick={openCreateProposal}>
                  Ajukan kompetisi
                </ButtonPrimary>
              </div>
            )
          )}
        </QueryState>
      )}

      <Dialog open={proposalOpen} onClose={() => setProposalOpen(false)} size="3xl">
        <DialogTitle>{editingProposal ? 'Edit pengajuan kompetisi' : 'Ajukan kompetisi baru'}</DialogTitle>
        <DialogBody className="max-h-[75vh] overflow-y-auto">
          <CompetitionProposalForm
            initial={
              editingProposal
                ? {
                    proposed_slug: editingProposal.proposed_slug,
                    title: editingProposal.title,
                    sponsor: editingProposal.sponsor ?? '',
                    metric: editingProposal.metric,
                    prize_pool: editingProposal.prize_pool ?? '',
                    starts_at: toDatetimeLocal(editingProposal.starts_at),
                    ends_at: toDatetimeLocal(editingProposal.ends_at),
                    overview_md: editingProposal.overview_md,
                    rules_md: editingProposal.rules_md,
                    dataset_info_md: editingProposal.dataset_info_md,
                    daily_submission_limit: String(editingProposal.daily_submission_limit),
                    cover_url: editingProposal.cover_url ?? null,
                  }
                : undefined
            }
            categorySlug={categorySlug}
            subcategorySlug={subcategorySlug}
            onCategoryChange={(cat, sub) => {
              setCategorySlug(cat)
              setSubcategorySlug(sub)
            }}
            pending={saveProposal.isPending}
            onSubmit={(form, submit) => saveProposal.mutateAsync({ form, submit })}
          />
        </DialogBody>
      </Dialog>
    </div>
  )
}
