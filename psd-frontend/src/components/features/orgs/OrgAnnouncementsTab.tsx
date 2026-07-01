'use client'

import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { ProfileAvatar } from '@/components/features/users/ProfileCover'
import {
  createOrgAnnouncement,
  deleteOrgAnnouncement,
  updateOrgAnnouncement,
} from '@/lib/api/orgs'
import { orgCan } from '@/lib/orgs/permissions'
import { orgCard, orgText, orgTextMuted } from '@/lib/orgs/org-ui'
import { profilePath } from '@/lib/routes/profile'
import { useAuth } from '@/lib/auth/useAuth'
import { OrgAnnouncement, OrgDetail, Profile } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import Textarea from '@/shared/Textarea'
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownMenu,
} from '@/shared/dropdown'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogDescription, DialogTitle } from '@/shared/dialog'
import {
  EllipsisVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} mnt lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam lalu`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function visibilityLabel(vis: 'public' | 'private') {
  return vis === 'public' ? 'Publik' : 'Hanya anggota'
}

function AnnouncementCard({
  ann,
  orgId,
  myRole,
  currentUserId,
  onChanged,
}: {
  ann: OrgAnnouncement
  orgId: string
  myRole: string | null | undefined
  currentUserId?: string
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(ann.body_md)
  const [visibility, setVisibility] = useState(ann.visibility)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const canManage =
    ann.author.user_id === currentUserId || orgCan(myRole, 'manage_members')

  const authorProfile: Profile = {
    id: ann.author.username,
    username: ann.author.username,
    name: ann.author.name ?? ann.author.username,
    avatar_url: ann.author.avatar_url ?? null,
    banner_url: null,
    accent_color: null,
    pronouns: null,
    location: null,
    bio: null,
    about_md: null,
    status_emoji: null,
    status_text: null,
    links: [],
    interests: [],
    onboarded: true,
    is_official: false,
    is_instructor: false,
    account_type: 'individual',
    role: 'member',
    email_verified: true,
    created_at: ann.created_at ?? new Date().toISOString(),
  }

  const updateMut = useMutation({
    mutationFn: (patch: { body_md?: string; visibility?: 'public' | 'private' }) =>
      updateOrgAnnouncement(orgId, ann.id, patch),
    onSuccess: () => {
      setEditing(false)
      onChanged()
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteOrgAnnouncement(orgId, ann.id),
    onSuccess: () => {
      setConfirmDelete(false)
      onChanged()
    },
  })

  return (
    <article className={`${orgCard} p-4`}>
      <div className="flex items-start gap-3">
        <Link href={profilePath(ann.author.username)} className="shrink-0">
          <ProfileAvatar profile={authorProfile} size="xs" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href={profilePath(ann.author.username)}
                className={`text-sm font-semibold ${orgText} hover:underline`}
              >
                {ann.author.name ?? ann.author.username}
              </Link>
              <p className={`text-xs ${orgTextMuted}`}>
                @{ann.author.username}
                {ann.created_at && (
                  <>
                    <span className="mx-1">·</span>
                    {timeAgo(ann.created_at)}
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Badge color={ann.visibility === 'public' ? 'sky' : 'zinc'}>
                {visibilityLabel(ann.visibility)}
              </Badge>
              {canManage && (
                <Dropdown>
                  <DropdownButton as={Button} plain aria-label="Kelola pengumuman">
                    <EllipsisVerticalIcon className="size-5 text-neutral-400" />
                  </DropdownButton>
                  <DropdownMenu anchor="bottom end" className="min-w-44">
                    <DropdownItem onClick={() => setEditing(true)}>
                      <PencilSquareIcon data-slot="icon" className="size-4" />
                      Edit
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem
                      onClick={() => updateMut.mutate({ visibility: 'public' })}
                      disabled={updateMut.isPending}
                    >
                      <EyeIcon data-slot="icon" className="size-4" />
                      Publik
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => updateMut.mutate({ visibility: 'private' })}
                      disabled={updateMut.isPending}
                    >
                      <EyeSlashIcon data-slot="icon" className="size-4" />
                      Hanya anggota
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem
                      onClick={() => setConfirmDelete(true)}
                      className="!text-red-600 dark:!text-red-400"
                    >
                      <TrashIcon data-slot="icon" className="size-4" />
                      Hapus
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              )}
            </div>
          </div>

          {editing ? (
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                updateMut.mutate({ body_md: body.trim(), visibility })
              }}
            >
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="!rounded-xl"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className={`text-xs font-medium ${orgTextMuted}`}>Visibilitas</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                  className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                >
                  <option value="public">Publik</option>
                  <option value="private">Hanya anggota</option>
                </select>
                <ButtonPrimary type="submit" disabled={updateMut.isPending || !body.trim()}>
                  Simpan
                </ButtonPrimary>
                <ButtonPrimary type="button" outline onClick={() => setEditing(false)}>
                  Batal
                </ButtonPrimary>
              </div>
            </form>
          ) : (
            <div className={`mt-2 text-sm ${orgText}`}>
              <SimpleMarkdown content={ann.body_md} />
            </div>
          )}

          {(ann.images ?? []).length > 0 && !editing && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(ann.images ?? []).map((src) => (
                <div key={src} className="relative aspect-video overflow-hidden rounded-xl">
                  <Image src={src} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Hapus pengumuman?</DialogTitle>
        <DialogDescription>Pengumuman ini akan dihapus permanen dari organisasi.</DialogDescription>
        <DialogActions>
          <ButtonPrimary outline type="button" onClick={() => setConfirmDelete(false)}>
            Batal
          </ButtonPrimary>
          <ButtonPrimary
            type="button"
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending}
            className="!bg-red-600 hover:!bg-red-700"
          >
            Hapus
          </ButtonPrimary>
        </DialogActions>
      </Dialog>
    </article>
  )
}

export function OrgAnnouncementsTab({
  orgId,
  handle,
  org,
  myRole,
  isMember,
}: {
  orgId: string
  handle: string
  org: OrgDetail
  myRole: string | null | undefined
  isMember: boolean
}) {
  const { user } = useAuth()
  const announcements = org.announcements ?? []
  const canPost = isMember && orgCan(myRole, 'post_announcement')
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['org', handle] })

  const createMut = useMutation({
    mutationFn: () =>
      createOrgAnnouncement(orgId, { body_md: body.trim(), visibility }),
    onSuccess: () => {
      setBody('')
      setVisibility('public')
      setError(null)
      invalidate()
    },
    onError: (e: Error) => setError(e.message),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    createMut.mutate()
  }

  return (
    <div className="space-y-6">
      {canPost && (
        <form onSubmit={onSubmit} className={`${orgCard} space-y-3 p-4`}>
          <h3 className={`text-sm font-semibold ${orgText}`}>Buat pengumuman</h3>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Bagikan kebutuhan, info terbaru, atau update organisasi…"
            className="!rounded-xl"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <GlobeAltIcon className="size-4 text-neutral-400" />
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
              >
                <option value="public">Publik — siapa saja bisa lihat</option>
                <option value="private">Hanya anggota organisasi</option>
              </select>
            </div>
            <ButtonPrimary type="submit" disabled={createMut.isPending || !body.trim()}>
              Publikasikan
            </ButtonPrimary>
          </div>
        </form>
      )}

      {!isMember && (
        <p className={`text-sm ${orgTextMuted}`}>
          Pengumuman publik dari organisasi ini. Bergabung sebagai anggota untuk melihat pengumuman internal.
        </p>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="space-y-3">
        {announcements.map((ann) => (
          <AnnouncementCard
            key={ann.id}
            ann={ann}
            orgId={orgId}
            myRole={myRole}
            currentUserId={user?.id}
            onChanged={invalidate}
          />
        ))}
        {!announcements.length && (
          <p className={`text-sm ${orgTextMuted}`}>
            {isMember ? 'Belum ada pengumuman. Jadilah yang pertama membagikan info!' : 'Belum ada pengumuman publik.'}
          </p>
        )}
      </div>
    </div>
  )
}
