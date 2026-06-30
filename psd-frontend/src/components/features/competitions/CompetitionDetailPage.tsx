'use client'

import { CompetitionCoverHero } from '@/components/features/competitions/CompetitionCoverHero'
import { CompetitionDeadlineBar } from '@/components/features/competitions/CompetitionDeadlineBar'
import { CompetitionMarkdown } from '@/components/features/competitions/CompetitionMarkdown'
import { CompetitionNotebooksTab } from '@/components/features/competitions/CompetitionNotebooksTab'
import { CompetitionStatsGrid } from '@/components/features/competitions/CompetitionStatsGrid'
import { CircleJourneyCTA } from '@/components/features/quests/CircleJourneyCTA'
import { useTrackView } from '@/lib/analytics/useTrackView'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell, FilterTabs } from '@/components/features/layout'
import {
  ApiError,
  getCompDetailStats,
  getCompetition,
  getLeaderboard,
  getMySubmissions,
  submitCompetition,
  submitEntry,
} from '@/lib/api/competitions'
import { getMyTeams } from '@/lib/api/teams'
import { useAuth } from '@/lib/auth/useAuth'
import {
  CompetitionDetail,
  CompDetailStats,
  LeaderboardEntry,
  PaginatedLeaderboard,
  Submission,
} from '@/types/api'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Select from '@/shared/Select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useMemo, useState, useEffect } from 'react'

const tabs = [
  { id: 'overview', label: 'Ikhtisar' },
  { id: 'data', label: 'Data' },
  { id: 'notebooks', label: 'Notebook' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'submissions', label: 'Submission' },
  { id: 'teams', label: 'Tim' },
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

const submissionStatusLabel: Record<string, string> = {
  submitted: 'Menunggu penilaian',
  under_review: 'Sedang direview',
  scored: 'Dinilai',
  rejected: 'Ditolak',
  queued: 'Antre',
  failed: 'Gagal',
}

const submissionStatusColor: Record<string, 'green' | 'red' | 'amber' | 'zinc'> = {
  submitted: 'amber',
  under_review: 'zinc',
  scored: 'green',
  rejected: 'red',
  queued: 'zinc',
  failed: 'red',
}

function fallbackDeadline(c: CompetitionDetail) {
  const now = Date.now()
  const start = new Date(c.starts_at).getTime()
  const end = new Date(c.ends_at).getTime()
  if (now < start) {
    return { phase: 'upcoming' as const, progress: 0, remaining_seconds: Math.floor((start - now) / 1000), remaining_text: '—', is_open: false }
  }
  if (now >= end) {
    return { phase: 'ended' as const, progress: 1, remaining_seconds: 0, remaining_text: 'Selesai', is_open: false }
  }
  const total = end - start
  return {
    phase: 'active' as const,
    progress: (now - start) / total,
    remaining_seconds: Math.floor((end - now) / 1000),
    remaining_text: '—',
    is_open: true,
  }
}

function CompetitionDetailInner({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'overview'
  const [board, setBoard] = useState<'public' | 'private'>('public')
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [submitTeamId, setSubmitTeamId] = useState('')

  useEffect(() => {
    const tid = searchParams.get('team_id')
    if (tid) setSubmitTeamId(tid)
  }, [searchParams])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { user, isLoggedIn } = useAuth()
  const qc = useQueryClient()

  const competition = useQuery<CompetitionDetail>({
    queryKey: ['competition', slug],
    queryFn: () => getCompetition(slug),
  })

  const stats = useQuery<CompDetailStats>({
    queryKey: ['comp-stats', slug],
    queryFn: () => getCompDetailStats(slug),
    enabled: tab === 'overview',
  })

  const c = competition.data
  const deadline = c?.deadline ?? (c ? fallbackDeadline(c) : null)
  const isOpen = deadline?.is_open ?? c?.status === 'active'

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

  const submissions = useQuery<Submission[]>({
    queryKey: ['my-submissions', slug],
    queryFn: () => getMySubmissions(slug),
    enabled: tab === 'submissions' && isLoggedIn,
  })

  const myTeams = useQuery({
    queryKey: ['my-teams'],
    queryFn: async () => (await getMyTeams()).items as { id: string; name: string }[],
    enabled: tab === 'submissions' && isLoggedIn,
  })

  const hasScoredSubmission = useMemo(
    () => (submissions.data ?? []).some((s) => s.status === 'scored'),
    [submissions.data]
  )

  const submitFile = useMutation({
    mutationFn: () =>
      submitCompetition(slug, file!, {
        note: note || undefined,
        team_id: submitTeamId || undefined,
      }),
    onSuccess: () => {
      setFile(null)
      setNote('')
      setSubmitError(null)
      qc.invalidateQueries({ queryKey: ['my-submissions', slug] })
      qc.invalidateQueries({ queryKey: ['comp-stats', slug] })
    },
    onError: (err) => {
      setSubmitError(err instanceof ApiError ? err.message : 'Gagal mengirim submission.')
    },
  })

  const submitJson = useMutation({
    mutationFn: () =>
      submitEntry(slug, { note: note || undefined, team_id: submitTeamId || undefined }),
    onSuccess: () => {
      setNote('')
      setSubmitError(null)
      qc.invalidateQueries({ queryKey: ['my-submissions', slug] })
      qc.invalidateQueries({ queryKey: ['comp-stats', slug] })
    },
    onError: (err) => {
      setSubmitError(err instanceof ApiError ? err.message : 'Gagal mengirim submission.')
    },
  })

  const statusBadge = useMemo(() => {
    if (!c) return null
    return <Badge color={statusColors[c.status]}>{statusLabels[c.status]}</Badge>
  }, [c])

  const entrantName = (e: LeaderboardEntry) =>
    e.entrant?.name ?? e.participant?.username ?? '—'

  return (
    <DetailPageShell>
      <QueryState isLoading={competition.isLoading} isError={competition.isError} error={competition.error}>
        {c && deadline && (
          <>
            <CompetitionCoverHero coverUrl={c.cover_url} title={c.title} />
            <DetailPageHeader
              title={c.title}
              subtitle={c.sponsor ? `Diselenggarakan oleh ${c.sponsor}` : undefined}
              badges={statusBadge}
              meta={
                <div className="flex flex-wrap items-center gap-3">
                  {c.prize_pool && (
                    <span className="font-medium text-primary-600 dark:text-primary-400">Hadiah: {c.prize_pool}</span>
                  )}
                  {c.metric && (
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      {c.metric}
                      {c.metric_direction ? ` — ${c.metric_direction}` : ''}
                    </span>
                  )}
                </div>
              }
              actions={
                isLoggedIn ? (
                  <ButtonPrimary href={`/competitions/${slug}?tab=submissions`} disabled={!isOpen}>
                    {isOpen ? 'Submit' : 'Submission ditutup'}
                  </ButtonPrimary>
                ) : (
                  <ButtonPrimary href={`/login?next=/competitions/${slug}`}>Gabung</ButtonPrimary>
                )
              }
            />

            <CompetitionDeadlineBar
              deadline={deadline}
              metric={c.metric}
              metricDirection={c.metric_direction}
              className="mb-6"
            />

            <FilterTabs
              tabs={tabs.map((t) => ({
                label: t.label,
                href: `/competitions/${slug}?tab=${t.id}`,
                isActive: tab === t.id,
              }))}
            />

            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 lg:p-8 dark:border-neutral-700/80 dark:bg-neutral-800/80">
              {tab === 'overview' && (
                <div className="space-y-8">
                  <QueryState
                    isLoading={stats.isLoading}
                    isError={stats.isError}
                    error={stats.error}
                    isEmpty={false}
                  >
                    {stats.data && <CompetitionStatsGrid stats={stats.data} />}
                  </QueryState>
                  <section>
                    <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Deskripsi</h3>
                    <CompetitionMarkdown content={c.overview_md} />
                  </section>
                  {c.rules_md && (
                    <section>
                      <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Aturan</h3>
                      <CompetitionMarkdown content={c.rules_md} />
                    </section>
                  )}
                  {c.prizes?.length > 0 && (
                    <section>
                      <h3 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Hadiah</h3>
                      <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                        {c.prizes.map((p) => (
                          <li key={p.rank}>
                            <strong className="text-neutral-800 dark:text-neutral-200">#{p.rank}</strong> — {p.reward}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}

              {tab === 'data' && (
                <CompetitionMarkdown content={c.dataset_info_md || 'Informasi dataset belum tersedia.'} />
              )}

              {tab === 'notebooks' && <CompetitionNotebooksTab slug={slug} isOpen={isOpen} />}

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
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'
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
                      {deadline.phase === 'active' && (
                        <p className="text-sm text-neutral-500">Berakhir dalam {deadline.remaining_text}</p>
                      )}
                    </div>
                  )}

                  {!privateLocked && (
                    <QueryState
                      isLoading={leaderboard.isLoading}
                      isError={leaderboard.isError}
                      error={leaderboard.error}
                      isEmpty={!leaderboard.data?.items.length}
                      emptyTitle="Leaderboard kosong"
                      emptyDescription="Belum ada submission yang dinilai admin."
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
                            const isMe =
                              e.participant?.username === user?.username ||
                              e.entrant?.name === user?.username
                            return (
                              <TableRow
                                key={`${e.rank}-${entrantName(e)}`}
                                className={isMe ? 'bg-primary-50/60 dark:bg-primary-950/30' : undefined}
                              >
                                <TableCell className="font-medium">{e.rank}</TableCell>
                                <TableCell>
                                  <span className="font-medium">{entrantName(e)}</span>
                                  {e.entrant?.kind === 'team' && (
                                    <Badge color="zinc" className="ms-2">
                                      Tim
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>{e.score}</TableCell>
                                <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
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
                      {isOpen ? (
                        <div className="rounded-2xl border border-dashed border-neutral-300 p-6 dark:border-neutral-600">
                          <p className="mb-1 text-sm text-neutral-600 dark:text-neutral-400">
                            Kirim prediksi Anda. Submission akan dinilai oleh tim humas — bukan skor instan.
                          </p>
                          <p className="mb-4 text-xs text-neutral-500">
                            Batas: {c.daily_submission_limit} submission/hari
                          </p>
                          {(myTeams.data?.length ?? 0) > 0 && (
                            <div className="mb-4">
                              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Submit sebagai
                              </label>
                              <Select
                                value={submitTeamId}
                                onChange={(e) => setSubmitTeamId(e.target.value)}
                                className="!rounded-xl w-full max-w-md text-sm"
                              >
                                <option value="">Solo (individu)</option>
                                {myTeams.data!.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    Tim: {t.name}
                                  </option>
                                ))}
                              </Select>
                            </div>
                          )}
                          <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            className="mb-3 block w-full text-sm text-neutral-700 file:me-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-700 dark:text-neutral-300 dark:file:bg-primary-950/50 dark:file:text-primary-300"
                            aria-label="Pilih file submission"
                          />
                          <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Catatan untuk reviewer (opsional)"
                            rows={2}
                            className="mb-4 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                          />
                          <div className="flex flex-wrap gap-2">
                            <ButtonPrimary
                              disabled={!file || submitFile.isPending}
                              onClick={() => submitFile.mutate()}
                            >
                              {submitFile.isPending ? 'Mengirim...' : 'Kirim berkas CSV'}
                            </ButtonPrimary>
                            <Button
                              outline
                              disabled={submitJson.isPending}
                              onClick={() => submitJson.mutate()}
                            >
                              Kirim tanpa berkas
                            </Button>
                          </div>
                          {submitError && (
                            <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
                              {submitError}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm dark:border-neutral-600 dark:bg-neutral-900/50">
                          Pendaftaran/Submission ditutup —{' '}
                          {deadline.phase === 'upcoming'
                            ? 'kompetisi belum dimulai.'
                            : 'kompetisi telah berakhir.'}
                        </div>
                      )}

                      {hasScoredSubmission && <CircleJourneyCTA variant="submission-scored" />}

                      <QueryState
                        isLoading={submissions.isLoading}
                        isError={submissions.isError}
                        error={submissions.error}
                        isEmpty={!submissions.data?.length}
                        emptyTitle="Belum ada submission"
                        emptyDescription="Kirim submission pertama Anda untuk muncul di daftar ini."
                      >
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableHeader>Waktu</TableHeader>
                              <TableHeader>Status</TableHeader>
                              <TableHeader>Skor</TableHeader>
                              <TableHeader className="w-[36%]">Catatan review</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(submissions.data ?? []).map((s) => (
                              <TableRow key={s.id}>
                                <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                                  {new Date(s.submitted_at ?? s.created_at ?? '').toLocaleString('id-ID')}
                                </TableCell>
                                <TableCell nowrap>
                                  <Badge color={submissionStatusColor[s.status] ?? 'zinc'}>
                                    {submissionStatusLabel[s.status] ?? s.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{(s.score ?? s.public_score) ?? '—'}</TableCell>
                                <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                                  {s.review_note ?? '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </QueryState>
                    </>
                  )}
                </div>
              )}

              {tab === 'teams' && (
                <div className="space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
                  <p>
                    Buat atau gabung tim untuk berkompetisi bersama. Kelola tim Anda di halaman{' '}
                    <Link href="/teams" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                      Tim
                    </Link>
                    .
                  </p>
                  <Button outline href="/teams">
                    Lihat tim saya
                  </Button>
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
