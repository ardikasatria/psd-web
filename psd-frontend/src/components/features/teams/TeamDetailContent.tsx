'use client'

import { NotebookCard } from '@/components/features/NotebookCard'
import { RepoCard } from '@/components/features/RepoCard'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { getNotebooks } from '@/lib/api/notebooks'
import { getRepos } from '@/lib/api/repos'
import {
  deleteTeam,
  getTeam,
  inviteMember,
  removeMember,
  requestJoin,
  setRole,
} from '@/lib/api/teams'
import { useAuth } from '@/lib/auth/useAuth'
import { Team, TeamMember, RepoSummary, NotebookSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import {
  LockClosedIcon,
  UserGroupIcon,
  UserMinusIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

const roleLabel: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Anggota',
}

export function TeamDetailContent({ slug }: { slug: string }) {
  const { user, isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'members' | 'assets'>('members')
  const [inviteUsername, setInviteUsername] = useState('')
  const [error, setError] = useState<string | null>(null)

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

  const invalidate = () => qc.invalidateQueries({ queryKey: ['team', slug] })

  const joinMut = useMutation({
    mutationFn: () => requestJoin(slug),
    onSuccess: () => setError(null),
    onError: (e: Error) => setError(e.message),
  })

  const leaveMut = useMutation({
    mutationFn: () => removeMember(slug, user!.username),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-teams'] })
      window.location.href = '/me/teams'
    },
    onError: (e: Error) => setError(e.message),
  })

  const inviteMut = useMutation({
    mutationFn: () => inviteMember(slug, inviteUsername.trim()),
    onSuccess: () => {
      setInviteUsername('')
      setError(null)
    },
    onError: (e: Error) => setError(e.message),
  })

  const roleMut = useMutation({
    mutationFn: ({ username, role }: { username: string; role: string }) => setRole(slug, username, role),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  })

  const removeMut = useMutation({
    mutationFn: (username: string) => removeMember(slug, username),
    onSuccess: invalidate,
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
  const isAdmin = team?.my_role === 'owner' || team?.my_role === 'admin'
  const isMember = !!team?.my_role
  const isOwner = team?.my_role === 'owner'

  if (teamQuery.isLoading) {
    return (
      <DetailPageShell>
        <p className="text-neutral-500">Memuat tim…</p>
      </DetailPageShell>
    )
  }

  if (teamQuery.isError || !team) {
    return (
      <DetailPageShell>
        <p className="text-red-600">Tim tidak ditemukan atau tidak dapat diakses.</p>
        <Link href="/teams" className="mt-4 inline-block text-sm text-primary-600">
          ← Kembali ke direktori
        </Link>
      </DetailPageShell>
    )
  }

  return (
    <DetailPageShell>
      <Link href="/teams" className="inline-flex text-sm font-medium text-neutral-500 hover:text-primary-600">
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
            <span className="text-sm text-neutral-500">{team.members.length} anggota</span>
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
          <p className="flex items-center gap-1.5 text-sm text-neutral-500">
            <LockClosedIcon className="size-4" aria-hidden />
            Tim privat — perlu undangan
          </p>
        )}
        {isMember && !isOwner && (
          <ButtonPrimary type="button" outline onClick={() => leaveMut.mutate()} disabled={leaveMut.isPending}>
            <UserMinusIcon className="size-4" aria-hidden />
            Keluar
          </ButtonPrimary>
        )}
        {isAdmin && (
          <ButtonPrimary href={`/teams/${slug}/requests`} outline>
            Permintaan bergabung
          </ButtonPrimary>
        )}
        {isOwner && (
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

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-6 flex gap-2 border-b border-neutral-200 dark:border-neutral-700">
        {(['members', 'assets'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t === 'members' ? 'Anggota' : 'Aset tim'}
          </button>
        ))}
      </div>

      {tab === 'members' && (
        <div className="space-y-6">
          {isAdmin && (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <Input
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder="Username untuk diundang"
                className="!rounded-xl flex-1 min-w-[200px]"
              />
              <ButtonPrimary type="button" onClick={() => inviteMut.mutate()} disabled={inviteMut.isPending || !inviteUsername.trim()}>
                Undang
              </ButtonPrimary>
            </div>
          )}

          <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200/80 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-800">
            {team.members.map((m: TeamMember) => (
              <li key={m.username} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
                    <UserGroupIcon className="size-4 text-neutral-500" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{m.name ?? m.username}</p>
                    <p className="text-sm text-neutral-500">@{m.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && m.username !== user?.username && m.role !== 'owner' ? (
                    <>
                      <Select
                        value={m.role}
                        onChange={(e) => {
                          const newRole = e.target.value
                          if (newRole === 'owner') {
                            if (!confirm(`Transfer kepemilikan tim ke ${m.username}? Anda akan menjadi admin.`)) return
                          }
                          roleMut.mutate({ username: m.username, role: newRole })
                        }}
                        className="!rounded-lg text-sm"
                      >
                        <option value="member">Anggota</option>
                        <option value="admin">Admin</option>
                        {isOwner && <option value="owner">Transfer owner</option>}
                      </Select>
                      <ButtonPrimary
                        type="button"
                        outline
                        onClick={() => {
                          if (confirm(`Keluarkan ${m.username} dari tim?`)) removeMut.mutate(m.username)
                        }}
                      >
                        Keluarkan
                      </ButtonPrimary>
                    </>
                  ) : (
                    <Badge color="zinc">{roleLabel[m.role] ?? m.role}</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'assets' && (
        <QueryState
          isLoading={reposQuery.isLoading || notebooksQuery.isLoading}
          isError={reposQuery.isError || notebooksQuery.isError}
          error={reposQuery.error ?? notebooksQuery.error}
          isEmpty={!(reposQuery.data?.length || notebooksQuery.data?.items.length)}
          emptyTitle="Belum ada aset tim"
          emptyDescription="Buat proyek, dataset, model, atau notebook dengan pemilik tim."
          skeletonColumns={2}
        >
          <div className="space-y-8">
            {(reposQuery.data?.length ?? 0) > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Repositori</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {reposQuery.data!.map((r: RepoSummary) => (
                    <RepoCard key={r.id} repo={r} />
                  ))}
                </div>
              </section>
            )}
            {(notebooksQuery.data?.items.length ?? 0) > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Notebook</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {notebooksQuery.data!.items.map((nb: NotebookSummary) => (
                    <NotebookCard key={nb.id} notebook={nb} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </QueryState>
      )}
    </DetailPageShell>
  )
}
