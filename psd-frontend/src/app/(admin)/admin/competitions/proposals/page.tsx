'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, AdminTableEmpty } from '@/components/admin/AdminShared'
import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { proposalStatusColor, proposalStatusLabel } from '@/components/features/competitions/competition-proposal-utils'
import { CompetitionCoverHero } from '@/components/features/competitions/CompetitionCoverHero'
import { getCompetitionProposal, listCompetitionProposals, reviewCompetitionProposal } from '@/lib/api/admin'
import type { AdminCompetitionProposal } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Input from '@/shared/Input'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

export default function AdminCompetitionProposalsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<string>('pending_review')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  const list = useQuery({
    queryKey: ['admin', 'competition-proposals', filter],
    queryFn: () => listCompetitionProposals({ status: filter || undefined, page_size: 50 }),
  })

  const detail = useQuery({
    queryKey: ['admin', 'competition-proposal', selectedId],
    queryFn: () => getCompetitionProposal(selectedId!),
    enabled: !!selectedId,
  })

  const review = useMutation({
    mutationFn: (body: { action: 'approve' | 'revision_requested' | 'reject'; review_note?: string }) =>
      reviewCompetitionProposal(selectedId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'competition-proposals'] })
      qc.invalidateQueries({ queryKey: ['competitions'] })
      setSelectedId(null)
      setReviewNote('')
    },
  })

  const p: AdminCompetitionProposal | undefined = detail.data

  return (
    <div>
      <AdminPageHeader
        title="Pengajuan kompetisi"
        description="Tinjau pengajuan kompetisi dari member — setujui, minta revisi, atau tolak."
        actions={
          <Button outline href="/admin/competitions">
            Kelola kompetisi
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { id: 'pending_review', label: 'Menunggu tinjauan' },
          { id: 'revision_requested', label: 'Revisi' },
          { id: 'approved', label: 'Disetujui' },
          { id: 'rejected', label: 'Ditolak' },
          { id: '', label: 'Semua' },
        ].map((f) => (
          <button
            key={f.id || 'all'}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              filter === f.id
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          {(list.data?.items ?? []).length === 0 ? (
            <AdminTableEmpty>Tidak ada pengajuan pada filter ini.</AdminTableEmpty>
          ) : (
            <AdminTable>
              <TableHead>
                <TableRow>
                  <TableHeader>Judul</TableHeader>
                  <TableHeader>Pemohon</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Diajukan</TableHeader>
                  <TableHeader>Aksi</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(list.data?.items ?? []).map((row: AdminCompetitionProposal) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell>
                      <div>{row.user.name}</div>
                      <div className="text-xs text-neutral-500">@{row.user.username}</div>
                    </TableCell>
                    <TableCell>
                      <Badge color={proposalStatusColor[row.status]}>{proposalStatusLabel[row.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {row.submitted_at ? new Date(row.submitted_at).toLocaleDateString('id-ID') : '—'}
                    </TableCell>
                    <TableCell>
                      <Button outline onClick={() => setSelectedId(row.id)}>
                        Tinjau
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </AdminTable>
          )}
        </AdminContentCard>
      )}

      <Dialog open={!!selectedId} onClose={() => setSelectedId(null)} size="3xl">
        <DialogTitle>Tinjau pengajuan kompetisi</DialogTitle>
        <DialogBody className="max-h-[75vh] space-y-4 overflow-y-auto">
          {detail.isLoading && <p className="text-sm text-neutral-500">Memuat...</p>}
          {p && (
            <>
              <CompetitionCoverHero coverUrl={p.cover_url} title={p.title} />
              <div className="flex flex-wrap items-center gap-2">
                <Badge color={proposalStatusColor[p.status]}>{proposalStatusLabel[p.status]}</Badge>
                <span className="text-sm text-neutral-500">
                  oleh {p.user?.name ?? '—'} · slug: {p.proposed_slug}
                </span>
              </div>
              {p.review_note && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  Catatan sebelumnya: {p.review_note}
                </div>
              )}
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-neutral-500">Sponsor</span>
                  <p className="font-medium">{p.sponsor ?? '—'}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Metrik</span>
                  <p className="font-medium">{p.metric}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Hadiah</span>
                  <p className="font-medium">{p.prize_pool ?? '—'}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Periode</span>
                  <p className="font-medium">
                    {new Date(p.starts_at).toLocaleDateString('id-ID')} – {new Date(p.ends_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Ikhtisar</p>
                <SimpleMarkdown content={p.overview_md} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Aturan</p>
                <SimpleMarkdown content={p.rules_md} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Dataset</p>
                <SimpleMarkdown content={p.dataset_info_md} />
              </div>
              {p.status === 'pending_review' && (
                <div>
                  <p className="mb-1 text-sm font-medium">Catatan untuk pemohon (wajib jika revisi/tolak)</p>
                  <Input
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Contoh: Lengkapi deskripsi dataset dan periode pendaftaran"
                    className="!rounded-xl"
                  />
                </div>
              )}
              {p.competition_slug && (
                <Link href={`/competitions/${p.competition_slug}`} className="text-sm text-primary-600 underline">
                  Lihat kompetisi publik →
                </Link>
              )}
            </>
          )}
        </DialogBody>
        {p?.status === 'pending_review' && (
          <DialogActions>
            <Button outline onClick={() => setSelectedId(null)}>
              Tutup
            </Button>
            <Button
              outline
              className="!text-red-600"
              disabled={review.isPending || !reviewNote.trim()}
              onClick={() => review.mutate({ action: 'reject', review_note: reviewNote })}
            >
              Tolak
            </Button>
            <Button
              outline
              disabled={review.isPending || !reviewNote.trim()}
              onClick={() => review.mutate({ action: 'revision_requested', review_note: reviewNote })}
            >
              Minta revisi
            </Button>
            <ButtonPrimary
              disabled={review.isPending}
              onClick={() => review.mutate({ action: 'approve' })}
            >
              Setujui & publikasikan
            </ButtonPrimary>
          </DialogActions>
        )}
      </Dialog>
    </div>
  )
}
