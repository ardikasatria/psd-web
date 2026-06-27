'use client'

import { CompetitionCoverHero } from '@/components/features/competitions/CompetitionCoverHero'
import { CircleJourneyCTA } from '@/components/features/quests/CircleJourneyCTA'
import { useTrackView } from '@/lib/analytics/useTrackView'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell, FilterTabs } from '@/components/features/layout'
import { ApiError, getCompetition, getLeaderboard, getSubmissions, submitCompetition } from '@/lib/api/competitions'
import { useAuth } from '@/lib/auth/useAuth'
import {
  CompetitionDetail,
  LeaderboardEntry,
  PaginatedLeaderboard,
  PaginatedSubmission,
  Submission,
} from '@/types/api'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

const tabs = [
  { id: 'overview', label: 'Ikhtisar' },
  { id: 'data', label: 'Data' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'submissions', label: 'Submission' },
]

const statusLabels: Record<string, string> = {
  active: 'Aktif',
  upcoming: 'Akan datang',
  past: 'Berakhir',
}

const statusColors: Record<string, 'green' | 'amber' | 'zinc'> = {
  active: 'green',
  upcoming: 'amber',
  past: 'zinc',
}

const submissionStatusLabel: Record<Submission['status'], string> = {
  queued: 'Antre',
  scored: 'Dinilai',
  failed: 'Gagal',
}

function Countdown({ endsAt }: { endsAt: string }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) {
        setLabel('Kompetisi telah berakhir')
        return
      }
      const days = Math.floor(diff / 86_400_000)
      const hours = Math.floor((diff % 86_400_000) / 3_600_000)
      const mins = Math.floor((diff % 3_600_000) / 60_000)
      setLabel(`${days} hari ${hours} jam ${mins} menit lagi`)
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [endsAt])

  return <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
}

function CompetitionDetailInner({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'overview'
  const [board, setBoard] = useState<'public' | 'private'>('public')
  const [file, setFile] = useState<File | null>(null)
  const [remainingToday, setRemainingToday] = useState<number | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { user, isLoggedIn } = useAuth()
  const qc = useQueryClient()

  const competition = useQuery<CompetitionDetail>({
    queryKey: ['competition', slug],
    queryFn: () => getCompetition(slug),
  })

  const c = competition.data
  const isActive = c?.status === 'active'

  useTrackView(!!c, 'competition', c?.slug, {
    category_slug: c?.category?.slug,
    tags: c?.tags,
  })

  const isPast = c?.status === 'past'
  const privateLocked = board === 'private' && !isPast

  const leaderboard = useQuery<PaginatedLeaderboard>({
    queryKey: ['leaderboard', slug, board],
    queryFn: () => getLeaderboard(slug, board),
    enabled: tab === 'leaderboard' && !privateLocked,
    retry: (_, err) => !(err instanceof ApiError && err.code === 'leaderboard_locked'),
  })

  const submissions = useQuery<PaginatedSubmission>({
    queryKey: ['submissions', slug],
    queryFn: () => getSubmissions(slug),
    enabled: tab === 'submissions' && isLoggedIn,
  })

  useEffect(() => {
    if (c && remainingToday === null) {
      setRemainingToday(c.daily_submission_limit)
    }
  }, [c, remainingToday])

  const hasScoredSubmission = useMemo(
    () => (submissions.data?.items ?? []).some((s: Submission) => s.status === 'scored'),
    [submissions.data?.items],
  )

  const submit = useMutation({
    mutationFn: () => submitCompetition(slug, file!),
    onSuccess: (result) => {
      setRemainingToday(result.remaining_today)
      setLimitReached(result.remaining_today <= 0)
      setFile(null)
      setSubmitError(null)
      qc.invalidateQueries({ queryKey: ['submissions', slug] })
      qc.invalidateQueries({ queryKey: ['leaderboard', slug] })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'limit_reached') {
        setLimitReached(true)
        setRemainingToday(0)
        setSubmitError(err.message)
      } else if (err instanceof ApiError) {
        setSubmitError(err.message)
      } else {
        setSubmitError('Gagal mengirim submission.')
      }
    },
  })

  const statusBadge = useMemo(() => {
    if (!c) return null
    return <Badge color={statusColors[c.status]}>{statusLabels[c.status]}</Badge>
  }, [c])

  return (
    <DetailPageShell>
      <QueryState isLoading={competition.isLoading} isError={competition.isError} error={competition.error}>
        {c && (
          <>
            <CompetitionCoverHero coverUrl={c.cover_url} title={c.title} />
            <DetailPageHeader
              title={c.title}
              subtitle={c.sponsor ? `Diselenggarakan oleh ${c.sponsor}` : undefined}
              badges={statusBadge}
              meta={
                c.prize_pool ? (
                  <span className="font-medium text-primary-600 dark:text-primary-400">Hadiah: {c.prize_pool}</span>
                ) : undefined
              }
            />

            <FilterTabs
              tabs={tabs.map((t) => ({
                label: t.label,
                href: `/competitions/${slug}?tab=${t.id}`,
                isActive: tab === t.id,
              }))}
            />

            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 lg:p-8 dark:border-neutral-700 dark:bg-neutral-800">
              {tab === 'overview' && (
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans">{c.overview_md}</pre>
                  <h3>Aturan</h3>
                  <pre className="whitespace-pre-wrap font-sans">{c.rules_md}</pre>
                </div>
              )}

              {tab === 'data' && (
                <pre className="whitespace-pre-wrap font-sans text-neutral-700 dark:text-neutral-300">
                  {c.dataset_info_md}
                </pre>
              )}

              {tab === 'leaderboard' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    {(['public', 'private'] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBoard(b)}
                        className={clsx(
                          'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                          board === b
                            ? 'bg-primary-500 text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300'
                        )}
                      >
                        {b === 'public' ? 'Publik' : 'Privat'}
                      </button>
                    ))}
                  </div>

                  {board === 'private' && !isPast && (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-10 text-center dark:border-neutral-600 dark:bg-neutral-900/50">
                      <LockClosedIcon className="size-10 text-neutral-400" aria-hidden />
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        Leaderboard privat dibuka setelah kompetisi berakhir
                      </p>
                      <Countdown endsAt={c.ends_at} />
                    </div>
                  )}

                  {board === 'private' && isPast && (
                    <p className="text-sm font-medium text-primary-600 dark:text-primary-400">Hasil akhir</p>
                  )}

                  {!privateLocked && (
                    <QueryState
                      isLoading={leaderboard.isLoading}
                      isError={leaderboard.isError}
                      error={leaderboard.error}
                      isEmpty={!leaderboard.data?.items.length}
                      emptyTitle="Leaderboard kosong"
                      emptyDescription="Belum ada submission yang dinilai."
                    >
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableHeader>Peringkat</TableHeader>
                            <TableHeader>Peserta</TableHeader>
                            <TableHeader>Skor</TableHeader>
                            <TableHeader>Waktu</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(leaderboard.data?.items ?? []).map((e: LeaderboardEntry) => {
                            const isMe = e.participant.username === user?.username
                            return (
                              <TableRow
                                key={e.rank}
                                className={isMe ? 'bg-primary-50/60 dark:bg-primary-950/30' : undefined}
                              >
                                <TableCell>{e.rank}</TableCell>
                                <TableCell className="font-medium">{e.participant.username}</TableCell>
                                <TableCell>{e.score}</TableCell>
                                <TableCell className="text-sm text-neutral-500">
                                  {new Date(e.submitted_at).toLocaleString('id-ID')}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </QueryState>
                  )}
                </div>
              )}

              {tab === 'submissions' && (
                <div className="space-y-6">
                  {!isLoggedIn ? (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      <Button href={`/login?next=/competitions/${slug}?tab=submissions`}>Masuk</Button> untuk mengirim
                      submission.
                    </p>
                  ) : (
                    <>
                      {isActive ? (
                        <div className="rounded-2xl border border-dashed border-neutral-300 p-6 dark:border-neutral-600">
                          <p className="mb-1 text-sm text-neutral-600 dark:text-neutral-400">
                            Unggah berkas prediksi CSV Anda.
                          </p>
                          <p className="mb-4 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                            Sisa hari ini: {remainingToday ?? c.daily_submission_limit}
                          </p>
                          <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            className="mb-4 block w-full text-sm"
                            aria-label="Pilih file submission"
                            disabled={limitReached}
                          />
                          <ButtonPrimary
                            disabled={!file || submit.isPending || limitReached}
                            onClick={() => submit.mutate()}
                          >
                            {submit.isPending ? 'Mengirim...' : 'Kirim submission'}
                          </ButtonPrimary>
                          {submitError && (
                            <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
                              {submitError}
                            </p>
                          )}
                          {limitReached && !submitError && (
                            <p className="mt-3 text-sm text-amber-700 dark:text-amber-400" role="status">
                              Batas {c.daily_submission_limit} submission/hari tercapai. Coba lagi besok.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm dark:border-neutral-600 dark:bg-neutral-900/50">
                          {c.status === 'upcoming'
                            ? 'Kompetisi belum dimulai — submission akan dibuka saat status aktif.'
                            : 'Kompetisi telah berakhir — submission ditutup.'}
                        </div>
                      )}

                      {hasScoredSubmission && <CircleJourneyCTA variant="submission-scored" />}

                      <QueryState
                        isLoading={submissions.isLoading}
                        isError={submissions.isError}
                        error={submissions.error}
                        isEmpty={!submissions.data?.items.length}
                        emptyTitle="Belum ada submission"
                        emptyDescription="Kirim submission pertama Anda untuk muncul di daftar ini."
                      >
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableHeader>Waktu</TableHeader>
                              <TableHeader>File</TableHeader>
                              <TableHeader>Status</TableHeader>
                              <TableHeader>Skor publik</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(submissions.data?.items ?? []).map((s: Submission) => (
                              <TableRow key={s.id}>
                                <TableCell className="text-sm text-neutral-500">
                                  {new Date(s.created_at).toLocaleString('id-ID')}
                                </TableCell>
                                <TableCell>{s.filename}</TableCell>
                                <TableCell>
                                  <Badge color={s.status === 'scored' ? 'green' : s.status === 'failed' ? 'red' : 'zinc'}>
                                    {submissionStatusLabel[s.status]}
                                  </Badge>
                                </TableCell>
                                <TableCell>{s.public_score ?? '—'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </QueryState>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </QueryState>
    </DetailPageShell>
  )
}

export function CompetitionDetailPage({ slug }: { slug: string }) {
  return (
    <Suspense>
      <CompetitionDetailInner slug={slug} />
    </Suspense>
  )
}
