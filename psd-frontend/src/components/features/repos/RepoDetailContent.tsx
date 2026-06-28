'use client'

import { CircleJourneyCTA } from '@/components/features/quests/CircleJourneyCTA'
import { FromRoomBadge } from '@/components/common/FromRoomBadge'
import { SyntheticBadge } from '@/components/common/SyntheticBadge'
import { useTrackView } from '@/lib/analytics/useTrackView'
import { LikeButton } from '@/components/features/repos/LikeButton'
import { ShareToFeedButton } from '@/components/features/social/ShareToFeedButton'
import { RepoCloneBanner } from '@/components/features/repos/RepoCloneBanner'
import { RepoEditDialog } from '@/components/features/repos/RepoEditDialog'
import { RepoFilesPanel } from '@/components/features/repos/RepoFilesPanel'
import { RepoMlRegistryLink } from '@/components/features/repos/RepoMlRegistryLink'
import { RepoPullRequestsPanel } from '@/components/features/repos/RepoPullRequestsPanel'
import { ThreadCard } from '@/components/features/ThreadCard'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { createRepoDiscussion, getRepoDiscussions } from '@/lib/api/community'
import { useAuth } from '@/lib/auth/useAuth'
import { getRepo } from '@/lib/api/repos'
import { profilePath } from '@/lib/routes/profile'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { RepoDetail, RepoKind, ThreadSummary } from '@/types/api'
import clsx from 'clsx'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useState } from 'react'
import { PencilSquareIcon } from '@heroicons/react/24/outline'

const kindLabel: Record<RepoKind, string> = {
  project: 'Proyek',
  dataset: 'Dataset',
  model: 'Model',
}

type TabId = 'readme' | 'files' | 'pulls' | 'discussions'

function PublishedAssetBanner() {
  const searchParams = useSearchParams()
  if (searchParams.get('published') !== '1') return null
  return <CircleJourneyCTA variant="asset-published" className="mb-6" />
}

export function RepoDetailContent({
  kind,
  owner,
  name,
}: {
  kind: RepoKind
  owner: string
  name: string
}) {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabId>('readme')
  const [showForm, setShowForm] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const repoKey = ['repo', kind, owner, name]
  const { data, isLoading, isError, error } = useQuery<RepoDetail>({
    queryKey: repoKey,
    queryFn: () => getRepo(kind, owner, name),
  })

  const isOwner = !!user && user.username === data?.owner.username

  useTrackView(!!data, 'repo', data?.id, {
    category_slug: data?.category?.slug,
    tags: data?.tags,
    kind,
  })

  const discussions = useQuery({
    queryKey: ['repo-discussions', data?.id],
    queryFn: () => getRepoDiscussions(data!.id),
    enabled: !!data?.id && tab === 'discussions',
  })

  const createDiscussion = useMutation({
    mutationFn: () => createRepoDiscussion(data!.id, { title, body_md: body, tags: [] }),
    onSuccess: () => {
      setTitle('')
      setBody('')
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['repo-discussions', data?.id] })
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!isLoggedIn) {
      router.push(`/login?next=${window.location.pathname}`)
      return
    }
    createDiscussion.mutate()
  }

  const refreshRepo = () => qc.invalidateQueries({ queryKey: repoKey })

  const tabs: { id: TabId; label: string }[] = [
    { id: 'readme', label: 'README' },
    { id: 'files', label: 'File' },
    { id: 'pulls', label: 'Kontribusi' },
    { id: 'discussions', label: 'Diskusi' },
  ]

  return (
    <DetailPageShell>
      <QueryState isLoading={isLoading} isError={isError} error={error}>
        {data && (
          <>
            <DetailPageHeader
              title={data.name}
              subtitle={data.description}
              badges={
                <>
                  <Badge color="zinc">{kindLabel[data.kind as RepoKind]}</Badge>
                  {data.synthetic && <SyntheticBadge />}
                  {data.from_room && <FromRoomBadge room={data.from_room} />}
                  <Link href={profilePath(data.owner.username)} className="text-sm text-primary-600 hover:underline">
                    {data.owner.username}
                  </Link>
                  {data.license && <Badge color="sky">{data.license}</Badge>}
                </>
              }
              actions={
                <div className="flex flex-wrap gap-2">
                  {data.kind === 'model' && <RepoMlRegistryLink repoId={data.id} isOwner={isOwner} />}
                  {isOwner && (
                    <Button outline onClick={() => setEditOpen(true)}>
                      <PencilSquareIcon className="size-4" data-slot="icon" aria-hidden />
                      Edit
                    </Button>
                  )}
                  <LikeButton repoId={data.id} initialLiked={data.liked} initialLikes={data.likes} />
                  <ShareToFeedButton kind={data.kind} slug={data.slug} />
                </div>
              }
            />

            <Suspense fallback={null}>
              <PublishedAssetBanner />
            </Suspense>

            {data.clone_url && <RepoCloneBanner cloneUrl={data.clone_url} />}

            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag: string) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="rounded-full bg-neutral-100 px-3 py-1 text-xs transition-colors hover:bg-primary-100 hover:text-primary-700 dark:bg-neutral-800 dark:hover:bg-primary-900/40"
                >
                  {tag}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-1 dark:border-neutral-700">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={clsx(
                    'rounded-t-xl px-4 py-2.5 text-sm font-medium transition-colors',
                    tab === t.id
                      ? 'bg-white text-primary-700 shadow-sm dark:bg-neutral-800 dark:text-primary-300'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="rounded-b-3xl rounded-tr-3xl border border-neutral-200/80 bg-white p-6 lg:p-8 dark:border-neutral-700 dark:bg-neutral-800">
              {tab === 'readme' && (
                <div className="space-y-6">
                  {data.synthetic && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      <div className="mb-2 flex items-center gap-2">
                        <SyntheticBadge />
                      </div>
                      Dataset buatan untuk eksperimen — bukan data resmi BPS, BMKG, atau instansi pemerintah.
                    </div>
                  )}
                  {data.synthetic && data.generation_spec && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                        Spesifikasi generator (reproduksi)
                      </h3>
                      <pre className="overflow-x-auto rounded-xl bg-neutral-50 p-4 text-xs dark:bg-neutral-900">
                        {JSON.stringify(data.generation_spec, null, 2)}
                      </pre>
                    </div>
                  )}
                  {data.readme_md ? (
                    <div className="prose dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{data.readme_md}</pre>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-600">
                      <p className="text-neutral-600 dark:text-neutral-400">
                        {isOwner ? 'Belum ada README untuk aset ini.' : 'README belum ditambahkan.'}
                      </p>
                      {isOwner && (
                        <ButtonPrimary className="mt-4" onClick={() => setEditOpen(true)}>
                          Tambahkan README
                        </ButtonPrimary>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tab === 'files' && (
                <RepoFilesPanel
                  repoId={data.id}
                  files={data.files}
                  isOwner={isOwner}
                  license={data.license}
                  onChange={refreshRepo}
                />
              )}

              {tab === 'pulls' && (
                <RepoPullRequestsPanel
                  repoId={data.id}
                  isMaintainer={isOwner}
                  cloneUrl={data.clone_url}
                />
              )}

              {tab === 'discussions' && (
                <div>
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Diskusi tentang aset ini. Klik utas untuk melihat detail.
                    </p>
                    <Button
                      outline
                      onClick={() =>
                        isLoggedIn ? setShowForm((v) => !v) : router.push(`/login?next=${window.location.pathname}`)
                      }
                    >
                      {showForm ? 'Batal' : 'Mulai diskusi'}
                    </Button>
                  </div>

                  {showForm && (
                    <form
                      onSubmit={handleSubmit}
                      className="mb-8 space-y-4 rounded-2xl border border-dashed border-neutral-300 p-5 dark:border-neutral-600"
                    >
                      <Input
                        placeholder="Judul diskusi"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="!rounded-xl"
                      />
                      <Textarea
                        placeholder="Tulis pertanyaan atau komentar..."
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={4}
                        className="!rounded-xl"
                      />
                      <ButtonPrimary type="submit" disabled={createDiscussion.isPending || !title.trim()}>
                        Kirim diskusi
                      </ButtonPrimary>
                    </form>
                  )}

                  <QueryState
                    isLoading={discussions.isLoading}
                    isError={discussions.isError}
                    error={discussions.error}
                    isEmpty={!discussions.data?.items.length}
                    emptyTitle="Belum ada diskusi"
                    emptyDescription="Belum ada diskusi. Mulai yang pertama."
                    skeletonColumns={2}
                  >
                    <div className="grid gap-4">
                      {(discussions.data?.items ?? []).map((t: ThreadSummary) => (
                        <ThreadCard key={t.id} thread={t} />
                      ))}
                    </div>
                  </QueryState>
                </div>
              )}
            </div>

            <RepoEditDialog
              repo={data}
              open={editOpen}
              onClose={() => setEditOpen(false)}
              onSaved={refreshRepo}
            />
          </>
        )}
      </QueryState>
    </DetailPageShell>
  )
}
