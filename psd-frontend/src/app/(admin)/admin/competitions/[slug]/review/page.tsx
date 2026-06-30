'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, AdminTableEmpty } from '@/components/admin/AdminShared'
import {
  adminListSubs,
  adminReject,
  adminReopen,
  adminScore,
  adminStartReview,
  getCompetition,
} from '@/lib/api/competitions'
import { ApiError } from '@/lib/api/client'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { Badge } from '@/shared/Badge'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

const statusTabs = ['submitted', 'under_review', 'scored', 'rejected'] as const

const statusLabel: Record<string, string> = {
  submitted: 'Baru',
  under_review: 'Direview',
  scored: 'Dinilai',
  rejected: 'Ditolak',
}

export default function AdminCompetitionReviewPage({ params }: { params: { slug: string } }) {
  const slug = params.slug
  const qc = useQueryClient()
  const [tab, setTab] = useState<(typeof statusTabs)[number]>('submitted')
  const [scoreId, setScoreId] = useState<string | null>(null)
  const [scoreVal, setScoreVal] = useState('')
  const [scoreNote, setScoreNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const comp = useQuery({ queryKey: ['competition', slug], queryFn: () => getCompetition(slug) })
  const queue = useQuery({
    queryKey: ['admin', 'comp-subs', slug, tab],
    queryFn: () => adminListSubs(slug, tab),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'comp-subs', slug] })
    qc.invalidateQueries({ queryKey: ['leaderboard', slug] })
  }

  const action = useMutation({
    mutationFn: async (p: { type: 'start' | 'score' | 'reject' | 'reopen'; id: string }) => {
      setError(null)
      if (p.type === 'start') return adminStartReview(slug, p.id)
      if (p.type === 'reject') return adminReject(slug, p.id)
      if (p.type === 'reopen') return adminReopen(slug, p.id)
      const sc = Number(scoreVal)
      if (!Number.isFinite(sc)) throw new ApiError(422, 'bad_score', 'Skor harus angka')
      const max = comp.data?.max_score
      if (max != null && sc > max) throw new ApiError(422, 'score_range', `Skor maksimal ${max}`)
      return adminScore(slug, p.id, { score: sc, note: scoreNote || undefined })
    },
    onSuccess: () => {
      setScoreId(null)
      setScoreVal('')
      setScoreNote('')
      invalidate()
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : 'Gagal memproses submission')
    },
  })

  const c = comp.data

  return (
    <div>
      <AdminPageHeader
        title={`Review — ${c?.title ?? slug}`}
        description="Antrian penilaian submission kompetisi oleh humas."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button outline href="/admin/competitions">
              Kembali
            </Button>
            <Button plain href={`/competitions/${slug}`} target="_blank">
              Pratinjau
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {statusTabs.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTab(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === s
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
            }`}
          >
            {statusLabel[s]}
          </button>
        ))}
      </div>

      {comp.isLoading || queue.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          {!queue.data?.items.length ? (
            <AdminTableEmpty>Antrian kosong untuk status ini.</AdminTableEmpty>
          ) : (
            <AdminTable>
              <TableHead>
                <TableRow>
                  <TableHeader>Peserta</TableHeader>
                  <TableHeader>Waktu</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Catatan</TableHeader>
                  <TableHeader>Aksi</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {queue.data.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.entrant?.name ?? '—'}</div>
                      {s.entrant?.username && (
                        <div className="text-xs text-neutral-500">@{s.entrant.username}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleString('id-ID') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge color={s.status === 'scored' ? 'green' : s.status === 'rejected' ? 'red' : 'zinc'}>
                        {statusLabel[s.status] ?? s.status}
                      </Badge>
                      {(s.score ?? s.public_score) != null && (
                        <span className="ms-2 text-sm font-medium">{(s.score ?? s.public_score)?.toFixed(4)}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-neutral-500">
                      {s.note || s.review_note || '—'}
                    </TableCell>
                    <TableCell className="space-x-1">
                      {tab === 'submitted' && (
                        <Button outline onClick={() => action.mutate({ type: 'start', id: s.id })}>
                          Mulai review
                        </Button>
                      )}
                      {(tab === 'submitted' || tab === 'under_review') && (
                        <>
                          <Button outline onClick={() => setScoreId(s.id)}>
                            Beri skor
                          </Button>
                          <Button outline onClick={() => action.mutate({ type: 'reject', id: s.id })}>
                            Tolak
                          </Button>
                        </>
                      )}
                      {(tab === 'scored' || tab === 'rejected') && (
                        <Button outline onClick={() => action.mutate({ type: 'reopen', id: s.id })}>
                          Buka kembali
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </AdminTable>
          )}
        </AdminContentCard>
      )}

      {scoreId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Beri skor</h3>
            {c?.max_score != null && (
              <p className="mb-3 text-xs text-neutral-500">Rentang skor: 0 – {c.max_score}</p>
            )}
            <Input
              type="number"
              step="any"
              placeholder="Skor"
              value={scoreVal}
              onChange={(e) => setScoreVal(e.target.value)}
              className="mb-3 !rounded-xl"
            />
            <Textarea
              placeholder="Catatan review (opsional)"
              value={scoreNote}
              onChange={(e) => setScoreNote(e.target.value)}
              rows={2}
              className="mb-4 !rounded-xl"
            />
            {error && (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button outline onClick={() => setScoreId(null)}>
                Batal
              </Button>
              <ButtonPrimary
                disabled={action.isPending}
                onClick={() => action.mutate({ type: 'score', id: scoreId })}
              >
                Simpan skor
              </ButtonPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
