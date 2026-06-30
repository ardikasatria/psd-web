'use client'

import { TeamCreateAssetsPanel } from '@/components/features/teams/TeamCreateAssetsPanel'
import { TeamDiscussionTab } from '@/components/features/teams/TeamDiscussionTab'
import { TeamFilesTab } from '@/components/features/teams/TeamFilesTab'
import { TeamMembersTab } from '@/components/features/teams/TeamMembersTab'
import { TeamOverviewTab } from '@/components/features/teams/TeamOverviewTab'
import { OwnerLeaveDialog } from '@/components/features/teams/OwnerLeaveDialog'
import { NotebookCard } from '@/components/features/NotebookCard'
import { RepoCard } from '@/components/features/RepoCard'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { getNotebooks } from '@/lib/api/notebooks'
import { getRepos } from '@/lib/api/repos'
import { deleteTeam, getTeam, leaveTeam, requestJoin } from '@/lib/api/teams'
import { fetchMyTeams, MY_TEAMS_QUERY_KEY, myTeamsFromCache } from '@/lib/teams/myTeamsQuery'
import { useAuth } from '@/lib/auth/useAuth'
import { can, normalizeTeamRole } from '@/lib/teams/permissions'
import { teamTabActive, teamTabIdle, teamTextMuted } from '@/lib/teams/team-ui'
import { RepoSummary, NotebookSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import { LockClosedIcon, UserMinusIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'

const TABS = [
  { id: 'overview', label: 'Ikhtisar' },
  { id: 'assets', label: 'Aset' },
  { id: 'discussion', label: 'Diskusi' },
  { id: 'files', label: 'File' },
  { id: 'members', label: 'Anggota' },
] as const

type TabId = (typeof TABS)[number]['id']

function tabFromSearchParams(params: URLSearchParams): TabId {
  const raw = params.get('tab') as TabId | null
  return raw && TABS.some((t) => t.id === raw) ? raw : 'overview'
}

function TeamDetailInner({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabId>(() => tabFromSearchParams(searchParams))
  const [error, setError] = useState<string | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)

  useEffect(() => {
    setTab(tabFromSearchParams(searchParams))
  }, [searchParams])

  const selectTab = useCallback(
    (id: TabId) => {
      setTab(id)
      const params = new URLSearchParams(searchParams.toString())
      if (id === 'overview') {
        params.delete('tab')
      } else {
        params.set('tab', id)
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const teamQuery = useQuery({
    queryKey: ['team', slug],
    queryFn: () => getTeam(slug),
  })

  const reposQuery = useQuery({
    queryKey: ['team-repos', slug],
    queryFn: async () => {
      const [projects, datasets, models] = await Promise.all([
        getRepos('project', { team: slug, page_size: 50 }),
        getRepos('dataset', { team: slug, page_size: 50 }),
        getRepos('model', { team: slug, page_size: 50 }),
      ])
      return [...projects.items, ...datasets.items, ...models.items]
    },
    enabled: tab === 'assets' && !!teamQuery.data,
  })

  const notebooksQuery = useQuery({
    queryKey: ['team-notebooks', slug],
    queryFn: () => getNotebooks({ team: slug, page_size: 50 }),
    enabled: tab === 'assets' && !!teamQuery.data,
  })

  const myTeamsQuery = useQuery({
    queryKey: MY_TEAMS_QUERY_KEY,
    queryFn: fetchMyTeams,
    enabled: isLoggedIn && tab === 'assets' && !teamQuery.data?.id,
  })

  const teamId =
    teamQuery.data?.id ?? myTeamsFromCache(myTeamsQuery.data).find((t) => t.slug === slug)?.id ?? ''

  const joinMut = useMutation({
    mutationFn: () => requestJoin(slug),
    onSuccess: () => setError(null),
    onError: (e: Error) => setError(e.message),
  })

  const leaveMut = useMutation({
    mutationFn: () => leaveTeam(slug),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: MY_TEAMS_QUERY_KEY })
      window.location.href = res.team_deleted ? '/teams' : '/me/teams'
    },
    onError: (e: Error) => setError(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteTeam(slug),
    onSuccess: () => {
      window.location.href = '/teams'
    },
    onError: (e: Error) => setError(e.message),
  })

  const team = teamQuery.data
  const myRole = normalizeTeamRole(team?.my_role)
  const isMember = !!myRole
  const isOwner = myRole === 'owner'

  if (teamQuery.isLoading) {
    return (
      <DetailPageShell>
        <p className={teamTextMuted}>Memuat tim…</p>
      </DetailPageShell>
    )
  }

  if (teamQuery.isError || !team) {
    return (
      <DetailPageShell>
        <p className="text-red-600 dark:text-red-400">Tim tidak ditemukan atau tidak dapat diakses.</p>
        <Link href="/teams" className="mt-4 inline-block text-sm text-primary-600 dark:text-primary-400">
          ← Kembali ke direktori
        </Link>
      </DetailPageShell>
    )
  }

  return (
    <DetailPageShell>
      <Link
        href="/teams"
        className="inline-flex text-sm font-medium text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400"
      >
        ← Semua tim
      </Link>

      <DetailPageHeader
        title={team.name}
        subtitle={team.description || 'Tim kolaborasi PSD'}
        badges={
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={team.visibility === 'public' ? 'green' : 'zinc'}>
              {team.visibility === 'public' ? 'Publik' : 'Privat'}
            </Badge>
            <span className={`text-sm ${teamTextMuted}`}>{team.members.length} anggota</span>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {!isMember && team.visibility === 'public' && isLoggedIn && (
          <ButtonPrimary type="button" onClick={() => joinMut.mutate()} disabled={joinMut.isPending}>
            Minta bergabung
          </ButtonPrimary>
        )}
        {!isMember && team.visibility === 'private' && (
          <p className={`flex items-center gap-1.5 text-sm ${teamTextMuted}`}>
            <LockClosedIcon className="size-4" aria-hidden />
            Tim privat — perlu undangan
          </p>
        )}
        {isMember && (
          <ButtonPrimary
            type="button"
            outline
            onClick={() => (isOwner ? setLeaveOpen(true) : leaveMut.mutate())}
            disabled={leaveMut.isPending}
          >
            <UserMinusIcon className="size-4" aria-hidden />
            Keluar
          </ButtonPrimary>
        )}
        {can(myRole, 'moderate_members') && (
          <ButtonPrimary href={`/teams/${slug}/requests`} outline>
            Permintaan bergabung
          </ButtonPrimary>
        )}
        {can(myRole, 'delete_team') && (
          <ButtonPrimary
            type="button"
            outline
            onClick={() => {
              if (confirm('Hapus tim ini? Tindakan tidak dapat dibatalkan.')) deleteMut.mutate()
            }}
            disabled={deleteMut.isPending}
          >
            Hapus tim
          </ButtonPrimary>
        )}
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? teamTabActive : teamTabIdle
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <TeamOverviewTab team={team} slug={slug} myRole={myRole} isMember={isMember} />
      )}

      {tab === 'members' && isMember && (
        <TeamMembersTab slug={slug} team={team} myRole={myRole} currentUsername={user?.username} />
      )}

      {tab === 'discussion' && isMember && <TeamDiscussionTab slug={slug} myRole={myRole} />}

      {tab === 'files' && isMember && <TeamFilesTab slug={slug} />}

      {tab === 'assets' && (
        <div className="space-y-6">
          {isMember && can(myRole, 'manage_asset') && (
            <TeamCreateAssetsPanel teamId={teamId} teamName={team.name} />
          )}

          <QueryState
            isLoading={reposQuery.isLoading || notebooksQuery.isLoading}
            isError={reposQuery.isError || notebooksQuery.isError}
            error={reposQuery.error ?? notebooksQuery.error}
            isEmpty={!(reposQuery.data?.length || notebooksQuery.data?.items.length)}
            emptyTitle="Belum ada aset tim"
            emptyDescription="Gunakan tombol di atas untuk membuat proyek, dataset, model, atau notebook bersama."
            skeletonColumns={2}
          >
            <div className="space-y-8">
              {(reposQuery.data?.length ?? 0) > 0 && (
                <section>
                  <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${teamTextMuted}`}>
                    Repositori
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {reposQuery.data!.map((r: RepoSummary) => (
                      <RepoCard key={r.id} repo={r} />
                    ))}
                  </div>
                </section>
              )}
              {(notebooksQuery.data?.items.length ?? 0) > 0 && (
                <section>
                  <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${teamTextMuted}`}>
                    Notebook
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {notebooksQuery.data!.items.map((nb: NotebookSummary) => (
                      <NotebookCard key={nb.id} notebook={nb} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </QueryState>
        </div>
      )}

      <OwnerLeaveDialog
        open={leaveOpen}
        teamName={team.name}
        memberCount={team.members.length}
        pending={leaveMut.isPending}
        onCancel={() => setLeaveOpen(false)}
        onConfirm={() => leaveMut.mutate()}
      />
    </DetailPageShell>
  )
}

export function TeamDetailContent({ slug }: { slug: string }) {
  return (
    <Suspense
      fallback={
        <DetailPageShell>
          <p className={teamTextMuted}>Memuat tim…</p>
        </DetailPageShell>
      }
    >
      <TeamDetailInner slug={slug} />
    </Suspense>
  )
}
