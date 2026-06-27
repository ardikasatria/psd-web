'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, AdminTableEmpty } from '@/components/admin/AdminShared'
import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import {
  eventProposalStatusColor,
  eventProposalStatusLabel,
} from '@/components/features/events/event-proposal-utils'
import { EventCoverHero, EventMediaCarousel } from '@/components/features/events/EventMedia'
import { getEventProposal, listEventProposals, reviewEventProposal } from '@/lib/api/admin'
import type { AdminEventProposal } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Input from '@/shared/Input'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

export default function AdminEventProposalsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('pending_review')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  const list = useQuery({
    queryKey: ['admin', 'event-proposals', filter],
    queryFn: () => listEventProposals({ status: filter || undefined, page_size: 50 }),
  })

  const detail = useQuery({
    queryKey: ['admin', 'event-proposal', selectedId],
    queryFn: () => getEventProposal(selectedId!),
    enabled: !!selectedId,
  })

  const review = useMutation({
    mutationFn: (body: { action: 'approve' | 'revision_requested' | 'reject'; review_note?: string }) =>
      reviewEventProposal(selectedId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'event-proposals'] })
      qc.invalidateQueries({ queryKey: ['events'] })
      setSelectedId(null)
      setReviewNote('')
    },
  })

  const p: AdminEventProposal | undefined = detail.data

  return (
    <div>
      <AdminPageHeader
        title="Pengajuan event"
        description="Tinjau pengajuan event dari member — setujui, minta revisi, atau tolak."
        actions={
          <Button outline href="/admin/events">
            Kelola event
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
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === f.id ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
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
                  <TableHeader>Tipe</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Aksi</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(list.data?.items ?? []).map((row: AdminEventProposal) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell>
                      <div>{row.user.name}</div>
                      <div className="text-xs text-neutral-500">@{row.user.username}</div>
                    </TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>
                      <Badge color={eventProposalStatusColor[row.status]}>{eventProposalStatusLabel[row.status]}</Badge>
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
        <DialogTitle>Tinjau pengajuan event</DialogTitle>
        <DialogBody className="max-h-[75vh] space-y-4 overflow-y-auto">
          {p && (
            <>
              <EventCoverHero coverUrl={p.cover_url} title={p.title} />
              <EventMediaCarousel urls={p.gallery_urls ?? []} />
              <Badge color={eventProposalStatusColor[p.status]}>{eventProposalStatusLabel[p.status]}</Badge>
              {p.review_note && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
                  Catatan: {p.review_note}
                </div>
              )}
              <SimpleMarkdown content={p.description_md} />
              {p.status === 'pending_review' && (
                <Input
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Catatan revisi / penolakan (wajib jika revisi atau tolak)"
                  className="!rounded-xl"
                />
              )}
              {p.event_slug && (
                <Link href={`/events/${p.event_slug}`} className="text-sm text-primary-600 underline">
                  Lihat event publik →
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
            <Button outline className="!text-red-600" disabled={!reviewNote.trim() || review.isPending} onClick={() => review.mutate({ action: 'reject', review_note: reviewNote })}>
              Tolak
            </Button>
            <Button outline disabled={!reviewNote.trim() || review.isPending} onClick={() => review.mutate({ action: 'revision_requested', review_note: reviewNote })}>
              Minta revisi
            </Button>
            <ButtonPrimary disabled={review.isPending} onClick={() => review.mutate({ action: 'approve' })}>
              Setujui & publikasikan
            </ButtonPrimary>
          </DialogActions>
        )}
      </Dialog>
    </div>
  )
}
