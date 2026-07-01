'use client'

import { CircleJourneyCTA } from '@/components/features/quests/CircleJourneyCTA'
import { FromRoomBadge } from '@/components/common/FromRoomBadge'
import { SyntheticBadge } from '@/components/common/SyntheticBadge'
import { useTrackView } from '@/lib/analytics/useTrackView'
import { AssetStatBar } from '@/components/features/engagement/AssetStatBar'
import { AssetBranchesTab } from '@/components/features/repos/AssetBranchesTab'
import { AssetContributorsTab } from '@/components/features/repos/AssetContributorsTab'
import { AssetFilesTab } from '@/components/features/repos/AssetFilesTab'
import { AssetReadmeTab } from '@/components/features/repos/AssetReadmeTab'
import { AssetRefSelectors } from '@/components/features/repos/AssetRefSelectors'
import { AssetVersionsTab } from '@/components/features/repos/AssetVersionsTab'
import { RepoCloneBanner } from '@/components/features/repos/RepoCloneBanner'
import { RepoEditDialog } from '@/components/features/repos/RepoEditDialog'
import { RepoFilesPanel } from '@/components/features/repos/RepoFilesPanel'
import { RepoMlRegistryLink } from '@/components/features/repos/RepoMlRegistryLink'
import { RepoRegisterModelVersion } from '@/components/features/repos/RepoRegisterModelVersion'
import { RepoContributePanel } from '@/components/features/repos/RepoContributePanel'
import { RepoPullRequestsPanel } from '@/components/features/repos/RepoPullRequestsPanel'
import { ThreadCard } from '@/components/features/ThreadCard'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { createRepoDiscussion, getRepoDiscussions } from '@/lib/api/community'
import { useAuth } from '@/lib/auth/useAuth'
import { useAssetCollaboration } from '@/lib/teams/useAssetCollaboration'
import { getRepo, provisionRepoGit } from '@/lib/api/repos'
import { assetKindPath, getAssetBranches, getAssetVersions } from '@/lib/api/asset'
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
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { PencilSquareIcon } from '@heroicons/react/24/outline'

const kindLabel: Record<RepoKind, string> = {
  project: 'Proyek',
  dataset: 'Dataset',
  model: 'Model',
}

type TabId = 'readme' | 'files' | 'versions' | 'branches' | 'contributors' | 'pulls' | 'discussions'

function PublishedAssetBanner() {
  const searchParams = useSearchParams()
  if (searchParams.get('published') !== '1') return null
  return <CircleJourneyCTA variant="asset-published" className="mb-6" />
}

function UploadErrorBanner() {
  const searchParams = useSearchParams()
  if (searchParams.get('upload_error') !== '1') return null
  return (
    <div
      className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
      role="alert"
    >
      Aset sudah dibuat, tetapi file awal gagal diunggah. Buka tab <strong>File</strong> di bawah untuk
      mengunggah ulang.
    </div>
  )
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
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabId>('readme')
  const [ref, setRef] = useState('main')
  const [showForm, setShowForm] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const repoKey = ['repo', kind, owner, name]
  const { data, isLoading, isError, error } = useQuery<RepoDetail>({
    queryKey: repoKey,
    queryFn: () => getRepo(kind, owner, name),
  })

  const { canEdit } = useAssetCollaboration(data?.team, data?.owner.username)

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

  const linkGit = useMutation({
    mutationFn: () => provisionRepoGit(data!.id),
    onSuccess: () => refreshRepo(),
  })
  const triedLink = useRef(false)

  useEffect(() => {
    if (!canEdit || !data?.id || data.clone_url || triedLink.current) return
    triedLink.current = true
    linkGit.mutate()
  }, [canEdit, data?.id, data?.clone_url, linkGit])

  const kp = assetKindPath(kind)

  const branches = useQuery({
    queryKey: ['asset-branches', kp, owner, name],
    queryFn: () => getAssetBranches(kp, owner, name),
    enabled: !!data?.clone_url,
  })

  const versions = useQuery({
    queryKey: ['asset-versions', kp, owner, name],
    queryFn: () => getAssetVersions(kp, owner, name),
    enabled: !!data?.clone_url,
  })

  useEffect(() => {
    const def = branches.data?.find((b) => b.is_default)?.name ?? branches.data?.[0]?.name
    if (def && ref === 'main' && def !== 'main') setRef(def)
  }, [branches.data, ref])

  const tabs = useMemo(() => {
    const items: { id: TabId; label: string }[] = [
      { id: 'readme', label: 'README' },
      { id: 'files', label: 'File' },
    ]
    if (data?.clone_url) {
      items.push(
        { id: 'versions', label: 'Versi' },
        { id: 'branches', label: 'Branch' },
        { id: 'contributors', label: 'Kontributor' },
      )
    }
    if (data?.clone_url) {
      items.push({ id: 'pulls', label: canEdit ? 'Kontribusi' : 'Ajukan kontribusi' })
    }
    items.push({ id: 'discussions', label: 'Diskusi' })
    return items
  }, [canEdit, data?.clone_url])

  useEffect(() => {
    if (tab === 'pulls' && !data?.clone_url) setTab('readme')
  }, [tab, data?.clone_url])

  useEffect(() => {
    if (searchParams.get('tab') === 'discussions') setTab('discussions')
  }, [searchParams])

  return (
    <DetailPageShell>
      <QueryState isLoading={isLoading} isError={isError} error={error}>
        {data && (
          <>
            <DetailPageHeader
              title={data.name}
              byline={
                <p className="text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">oleh </span>
                  <Link
                    href={profilePath(data.owner.username)}
                    className="font-medium text-primary-700 hover:underline dark:text-primary-300"
                  >
                    {data.owner.username}
                  </Link>
                </p>
              }
              subtitle={data.description}
              badges={
                <>
                  <Badge color="zinc">{kindLabel[data.kind as RepoKind]}</Badge>
                  {data.synthetic && <SyntheticBadge />}
                  {data.from_room && <FromRoomBadge room={data.from_room} />}
                  {data.license && <Badge color="sky">{data.license}</Badge>}
                </>
              }
              actions={
                <div className="flex flex-wrap gap-2">
                  {data.kind === 'model' && <RepoMlRegistryLink repoId={data.id} isOwner={canEdit} />}
                  {!canEdit && data.clone_url && (
                    <Button outline onClick={() => setTab('pulls')}>
                      Ajukan kontribusi
                    </Button>
                  )}
                  {canEdit && (
                    <Button outline onClick={() => setEditOpen(true)}>
                      <PencilSquareIcon className="size-4" data-slot="icon" aria-hidden />
                      Edit
                    </Button>
                  )}
                </div>
              }
            />

            <AssetStatBar
              kind={data.kind}
              slug={data.slug}
              ownerUsername={data.owner.username}
              pageUrl={typeof window !== 'undefined' ? window.location.href : pathname}
              forumHref={`${pathname}?tab=discussions`}
              onDownload={
                data.files.some((f) => f.url)
                  ? () => {
                      const file = data.files.find((f) => f.url)
                      if (file?.url) window.open(file.url, '_blank', 'noopener,noreferrer')
                    }
                  : undefined
              }
              className="mb-2"
            />

            <Suspense fallback={null}>
              <PublishedAssetBanner />
              <UploadErrorBanner />
            </Suspense>

            {data.clone_url && <RepoCloneBanner cloneUrl={data.clone_url} />}

            {data.kind === 'model' && canEdit && (
              <RepoRegisterModelVersion repoId={data.id} isOwner={canEdit} />
            )}

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

            {data.clone_url && (
              <AssetRefSelectors
                className="mb-4"
                refValue={ref}
                onRefChange={setRef}
                branches={branches.data ?? [{ name: 'main', is_default: true }]}
                versions={versions.data ?? []}
              />
            )}

            <div className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-700">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={clsx(
                    'rounded-t-xl px-4 py-2.5 text-sm font-medium motion-safe:transition-colors',
                    tab === t.id
                      ? 'bg-white text-primary-700 shadow-sm dark:bg-neutral-800 dark:text-primary-300'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-200',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="rounded-b-3xl rounded-tr-3xl border border-t-0 border-neutral-200/80 bg-white p-6 lg:p-8 dark:border-neutral-700 dark:bg-neutral-900/40">
              {tab === 'readme' && (
                <AssetReadmeTab
                  kind={kind}
                  owner={owner}
                  name={name}
                  ref={ref}
                  synthetic={data.synthetic}
                  generationSpec={data.generation_spec}
                  isOwner={canEdit}
                  onEdit={() => setEditOpen(true)}
                />
              )}

              {tab === 'files' && (
                <AssetFilesTab
                  kind={kind}
                  owner={owner}
                  name={name}
                  ref={ref}
                  hasGit={Boolean(data.clone_url)}
                  legacyPanel={
                    <RepoFilesPanel
                      repoId={data.id}
                      files={data.files}
                      isOwner={canEdit}
                      license={data.license}
                      cloneUrl={data.clone_url}
                      sourceOfTruth={data.source_of_truth}
                      onChange={refreshRepo}
                    />
                  }
                />
              )}

              {tab === 'versions' && data.clone_url && (
                <AssetVersionsTab kind={kind} owner={owner} name={name} onCheckout={setRef} />
              )}

              {tab === 'branches' && data.clone_url && (
                <AssetBranchesTab
                  kind={kind}
                  owner={owner}
                  name={name}
                  ref={ref}
                  onRefChange={setRef}
                />
              )}

              {tab === 'contributors' && data.clone_url && (
                <AssetContributorsTab kind={kind} owner={owner} name={name} />
              )}

              {tab === 'pulls' && data.clone_url && (
                canEdit ? (
                  <RepoPullRequestsPanel
                    repoId={data.id}
                    cloneUrl={data.clone_url}
                    linkingGit={linkGit.isPending}
                    linkError={linkGit.isError}
                    onLinkGit={() => linkGit.mutate()}
                  />
                ) : (
                  <RepoContributePanel repoId={data.id} ownerUsername={data.owner.username} />
                )
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
