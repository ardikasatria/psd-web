'use client'

import { CategoryBadge } from '@/components/common/CategoryBadge'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageShell } from '@/components/features/layout'
import { FramingCountdown, isFramingExpired } from '@/components/features/rooms/FramingCountdown'
import {
  COMPONENT_KIND_LABEL,
  COMPONENT_KINDS,
  COMPONENT_KIND_DESC,
  RoomStatusBadge,
} from '@/components/features/rooms/room-utils'
import {
  addComponent,
  closeRoom,
  deleteComponent,
  getComponents,
  getRoom,
  joinRoom,
  publishRoom,
  startFraming,
} from '@/lib/api/rooms'
import { useAuth } from '@/lib/auth/useAuth'
import { ComponentKind, IdeaRoom, ProblemComponent, RoomMember, RoomStatus } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { Field, Label } from '@/shared/fieldset'
import clsx from 'clsx'
import {
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  Cog6ToothIcon,
  TrashIcon,
  UserGroupIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  RoomClosedMemberBanner,
  RoomGeneratingBanner,
  RoomProblemPanel,
} from '@/components/features/rooms/RoomProblemPanel'
import { RoomCoverHero } from '@/components/features/rooms/RoomCoverField'
import { RoomChallengePanel } from '@/components/features/rooms/RoomChallengePanel'
import { RoomSolutionPanel } from '@/components/features/rooms/RoomSolutionPanel'

const MASTER_ROLES = new Set(['owner', 'admin'])

function MasterPanel({
  room,
  onAction,
  pending,
}: {
  room: IdeaRoom
  onAction: (action: 'publish' | 'start-framing' | 'close', hours?: number) => void
  pending: boolean
}) {
  const [framingHours, setFramingHours] = useState('72')

  return (
    <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/80 to-indigo-50/50 p-5 dark:border-violet-800/50 dark:from-violet-950/30 dark:to-indigo-950/20">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
        <Cog6ToothIcon className="size-4" aria-hidden />
        Panel Master
      </div>
      <div className="flex flex-wrap gap-2">
        {room.status === 'draft' && (
          <ButtonPrimary type="button" disabled={pending} onClick={() => onAction('publish')}>
            Terbitkan ruang
          </ButtonPrimary>
        )}
        {room.status === 'open' && (
          <>
            <div className="flex flex-wrap items-end gap-2">
              <Field>
                <Label className="text-xs">Tenggang framing (jam)</Label>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={framingHours}
                  onChange={(e) => setFramingHours(e.target.value)}
                  className="!rounded-xl w-24"
                />
              </Field>
              <ButtonPrimary
                type="button"
                disabled={pending}
                onClick={() => onAction('start-framing', Number(framingHours) || 72)}
              >
                Mulai framing
              </ButtonPrimary>
            </div>
            <ButtonPrimary type="button" outline disabled={pending} onClick={() => onAction('close')}>
              Tutup pendaftaran
            </ButtonPrimary>
          </>
        )}
        {room.status === 'framing' && (
          <ButtonPrimary type="button" outline disabled={pending} onClick={() => onAction('close')}>
            Tutup ruang
          </ButtonPrimary>
        )}
      </div>
    </div>
  )
}

function ComponentBlock({
  kind,
  items,
  canDelete,
  onDelete,
  deletingId,
}: {
  kind: ComponentKind
  items: ProblemComponent[]
  canDelete: (c: ProblemComponent) => boolean
  onDelete: (id: string) => void
  deletingId: string | null
}) {
  if (!items.length) return null
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {COMPONENT_KIND_LABEL[kind]}
        </h3>
        <p className="text-xs text-neutral-500">{COMPONENT_KIND_DESC[kind]}</p>
      </div>
      <ul className="space-y-2">
        {items.map((c) => (
          <li
            key={c.id}
            className="group rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800/80"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-neutral-500">@{c.author.username}</span>
              {canDelete(c) && (
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  disabled={deletingId === c.id}
                  className="rounded-lg p-1 text-neutral-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40"
                  aria-label="Hapus komponen"
                >
                  <TrashIcon className="size-4" />
                </button>
              )}
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {c.content_md}
            </pre>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function RoomDetailContent({ slug }: { slug: string }) {
  const { user, isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'overview' | 'framing' | 'members' | 'problem' | 'solution'>('overview')
  const [componentKind, setComponentKind] = useState<ComponentKind>('context')
  const [componentBody, setComponentBody] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const roomQuery = useQuery({
    queryKey: ['idea-room', slug],
    queryFn: () => getRoom(slug),
    refetchInterval: (q) => (q.state.data?.status === 'generating' ? 3000 : false),
  })

  const componentsQuery = useQuery({
    queryKey: ['idea-room-components', slug],
    queryFn: async () => {
      const res = await getComponents(slug)
      return res.items as ProblemComponent[]
    },
    enabled: roomQuery.data?.status === 'framing' || (roomQuery.data?.components_count ?? 0) > 0,
  })

  const room = roomQuery.data
  const isMaster = room?.my_role != null && MASTER_ROLES.has(room.my_role)
  const isMember = !!room?.my_role
  const canJoin =
    isLoggedIn &&
    !isMember &&
    room &&
    (room.status === 'open' || room.status === 'framing')
  const framingActive = room?.status === 'framing'
  const framingExpired = framingActive && isFramingExpired(room.framing_deadline)
  const solutionPhase = ['solving', 'submitted', 'finished', 'challenged'].includes(room?.status ?? '')

  useEffect(() => {
    if (solutionPhase) setTab('solution')
  }, [solutionPhase])

  const grouped = useMemo(() => {
    const map: Record<ComponentKind, ProblemComponent[]> = {
      context: [],
      constraint: [],
      goal: [],
      data_need: [],
      metric: [],
    }
    for (const c of componentsQuery.data ?? []) {
      map[c.kind]?.push(c)
    }
    return map
  }, [componentsQuery.data])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['idea-room', slug] })
    qc.invalidateQueries({ queryKey: ['idea-room-components', slug] })
  }

  const masterAction = useMutation({
    mutationFn: async ({ action, hours }: { action: string; hours?: number }) => {
      if (action === 'publish') return publishRoom(slug)
      if (action === 'start-framing') return startFraming(slug, hours ?? 72)
      return closeRoom(slug)
    },
    onSuccess: () => {
      setActionError(null)
      invalidate()
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const joinMut = useMutation({
    mutationFn: () => joinRoom(slug),
    onSuccess: () => {
      setActionError(null)
      invalidate()
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const addMut = useMutation({
    mutationFn: () => addComponent(slug, componentKind, componentBody.trim()),
    onSuccess: () => {
      setComponentBody('')
      setActionError(null)
      invalidate()
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteComponent(slug, id),
    onSuccess: invalidate,
  })

  const handleAddComponent = (e: FormEvent) => {
    e.preventDefault()
    if (!componentBody.trim()) return
    addMut.mutate()
  }

  const canDeleteComponent = (c: ProblemComponent) =>
    !!user && (c.author.username === user.username || isMaster)

  if (roomQuery.isLoading) {
    return (
      <DetailPageShell>
        <p className="text-neutral-500">Memuat ruang ide…</p>
      </DetailPageShell>
    )
  }

  if (roomQuery.isError || !room) {
    return (
      <DetailPageShell>
        <p className="text-red-600">Ruang tidak ditemukan atau tidak dapat diakses.</p>
        <Link href="/idea-rooms" className="mt-4 inline-block text-sm text-violet-600 hover:underline">
          Kembali ke direktori
        </Link>
      </DetailPageShell>
    )
  }

  const capacityLabel =
    room.max_members != null
      ? `${room.member_count} / ${room.max_members} anggota`
      : `${room.member_count} anggota`

  return (
    <DetailPageShell>
      <Link
        href="/idea-rooms"
        className="inline-flex text-sm font-medium text-neutral-500 transition hover:text-violet-600 dark:hover:text-violet-400"
      >
        Ruang Ide
      </Link>

      <header className="mt-6 space-y-5">
        <RoomCoverHero coverUrl={room.cover_url} title={room.title} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <RoomStatusBadge status={room.status as RoomStatus} />
              <CategoryBadge category={room.category} subcategory={room.subcategory} />
              {room.status === 'challenged' && room.competition_slug && (
                <Link
                  href={`/competitions/${room.competition_slug}`}
                  className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800 transition hover:bg-rose-200 dark:bg-rose-900/50 dark:text-rose-200 dark:hover:bg-rose-900/70"
                >
                  <ArrowTopRightOnSquareIcon className="size-3.5" aria-hidden />
                  Kompetisi penantang
                </Link>
              )}
            </div>
            {!room.cover_url && (
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                {room.title}
              </h1>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {canJoin && (
              <ButtonPrimary type="button" onClick={() => joinMut.mutate()} disabled={joinMut.isPending}>
                <UserPlusIcon className="size-4" aria-hidden />
                {joinMut.isPending ? 'Bergabung…' : 'Gabung ruang'}
              </ButtonPrimary>
            )}
            {room.team_slug && isMember && (
              <ButtonPrimary href={`/teams/${room.team_slug}`} outline>
                <ArrowTopRightOnSquareIcon className="size-4" aria-hidden />
                Kelola tim
              </ButtonPrimary>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1.5">
            <UserGroupIcon className="size-4" aria-hidden />
            {capacityLabel}
          </span>
          {(room.components_count ?? 0) > 0 && (
            <span>{room.components_count} komponen masalah</span>
          )}
          {framingActive && room.framing_deadline && (
            <FramingCountdown deadline={room.framing_deadline} />
          )}
        </div>

        {room.pitch_md && (
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {room.pitch_md}
            </pre>
          </div>
        )}

        {actionError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {actionError}
          </p>
        )}

        {isMaster && (
          <MasterPanel
            room={room}
            pending={masterAction.isPending}
            onAction={(action, hours) => masterAction.mutate({ action, hours })}
          />
        )}

        {isMaster && room.status === 'closed' && (
          <RoomProblemPanel
            slug={slug}
            generationError={room.generation_error}
            onGenerated={() => invalidate()}
          />
        )}

        {!isMaster && isMember && room.status === 'closed' && <RoomClosedMemberBanner />}

        {room.status === 'generating' && <RoomGeneratingBanner />}
      </header>

      <nav className="mt-8 flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {(
          [
            { id: 'overview' as const, label: 'Ringkasan' },
            { id: 'framing' as const, label: 'Framing', show: framingActive || (room.components_count ?? 0) > 0 },
            { id: 'members' as const, label: 'Anggota' },
            {
              id: 'problem' as const,
              label: 'Masalah & Data',
              show: room.status === 'generating',
            },
            {
              id: 'solution' as const,
              label: 'Solusi',
              show: solutionPhase,
            },
          ] satisfies Array<{ id: typeof tab; label: string; show?: boolean }>
        )
          .filter((t) => t.show !== false)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={clsx(
                'border-b-2 px-4 py-2.5 text-sm font-medium transition -mb-px',
                tab === t.id
                  ? 'border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300',
              )}
            >
              {t.label}
            </button>
          ))}
      </nav>

      <div className="mt-6">
        {tab === 'overview' && (
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                { label: 'Status', value: room.status, icon: ClockIcon },
                { label: 'Anggota', value: capacityLabel, icon: UserGroupIcon },
                {
                  label: 'Komponen',
                  value: String(room.components_count ?? 0),
                  icon: Cog6ToothIcon,
                },
              ] as const
            ).map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <stat.icon className="mb-2 size-5 text-violet-500" aria-hidden />
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{stat.label}</p>
                <p className="mt-1 text-lg font-semibold capitalize text-neutral-900 dark:text-neutral-100">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === 'members' && (
          <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200/80 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-800">
            {(room.members ?? []).map((m: RoomMember) => (
              <li key={m.username} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{m.name ?? m.username}</p>
                  <p className="text-sm text-neutral-500">@{m.username}</p>
                </div>
                <Badge color={m.role === 'owner' ? 'violet' : 'zinc'}>{m.role}</Badge>
              </li>
            ))}
          </ul>
        )}

        {tab === 'problem' && (
          <div className="space-y-6">
            {room.status === 'generating' && <RoomGeneratingBanner />}
          </div>
        )}

        {tab === 'solution' && (
          <div className="space-y-8">
            <RoomSolutionPanel room={room} slug={slug} isMaster={isMaster} isMember={isMember} />
            {(room.status === 'finished' || room.status === 'challenged') && (
              <RoomChallengePanel room={room} slug={slug} isMaster={isMaster} />
            )}
          </div>
        )}

        {tab === 'framing' && (
          <div className="space-y-8">
            {isMember && framingActive && !framingExpired && (
              <form
                onSubmit={handleAddComponent}
                className="space-y-4 rounded-2xl border border-violet-200/60 bg-violet-50/30 p-5 dark:border-violet-800/40 dark:bg-violet-950/20"
              >
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Tambah komponen masalah
                </h2>
                <div className="flex flex-wrap gap-2">
                  {COMPONENT_KINDS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setComponentKind(k)}
                      className={clsx(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition',
                        componentKind === k
                          ? 'bg-violet-600 text-white'
                          : 'bg-white text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-600',
                      )}
                    >
                      {COMPONENT_KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
                <Field>
                  <Label>Konten ({COMPONENT_KIND_LABEL[componentKind]})</Label>
                  <Textarea
                    value={componentBody}
                    onChange={(e) => setComponentBody(e.target.value)}
                    rows={4}
                    placeholder={COMPONENT_KIND_DESC[componentKind]}
                    className="!rounded-xl"
                  />
                </Field>
                <ButtonPrimary type="submit" disabled={addMut.isPending || !componentBody.trim()}>
                  {addMut.isPending ? 'Menyimpan…' : 'Tambah komponen'}
                </ButtonPrimary>
              </form>
            )}

            {framingExpired && framingActive && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                Tenggang framing telah berakhir. Master dapat menutup ruang; komponen baru tidak dapat ditambahkan.
              </p>
            )}

            <QueryState
              isLoading={componentsQuery.isLoading}
              isError={componentsQuery.isError}
              error={componentsQuery.error}
              isEmpty={!(componentsQuery.data?.length ?? 0)}
              emptyTitle="Belum ada komponen"
              emptyDescription="Tambahkan potongan masalah pertama — konteks, batasan, tujuan, kebutuhan data, atau metrik."
              skeletonColumns={1}
            >
              <div className="space-y-8">
                {COMPONENT_KINDS.map((kind) => (
                  <ComponentBlock
                    key={kind}
                    kind={kind}
                    items={grouped[kind]}
                    canDelete={canDeleteComponent}
                    onDelete={(id) => deleteMut.mutate(id)}
                    deletingId={deleteMut.isPending ? (deleteMut.variables ?? null) : null}
                  />
                ))}
              </div>
            </QueryState>
          </div>
        )}
      </div>
    </DetailPageShell>
  )
}
