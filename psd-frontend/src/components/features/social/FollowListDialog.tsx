'use client'

import { useToast } from '@/components/common/Toast'
import { getFollowers, getFollowing, removeFollower } from '@/lib/api/social'
import { getApiErrorMessage } from '@/lib/api/errors'
import { profilePath } from '@/lib/routes/profile'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { QueryState } from '@/components/features/QueryState'
import { Dialog, DialogBody, DialogTitle } from '@/shared/dialog'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OwnerRef } from '@/types/api'

export function FollowListDialog({
  username,
  mode,
  open,
  onClose,
  isOwner,
  onFollowerRemoved,
}: {
  username: string
  mode: 'followers' | 'following'
  open: boolean
  onClose: () => void
  isOwner?: boolean
  onFollowerRemoved?: () => void
}) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const queryKey = [mode, username] as const

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => (mode === 'followers' ? getFollowers(username) : getFollowing(username)),
    enabled: open,
  })

  const remove = useMutation({
    mutationFn: (followerUsername: string) => removeFollower(username, followerUsername),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey })
      await qc.invalidateQueries({ queryKey: ['user', username] })
      onFollowerRemoved?.()
    },
    onError: (err) => toast(getApiErrorMessage(err, 'Gagal menghapus pengikut.'), 'error'),
  })

  const canRemove = isOwner && mode === 'followers'

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>{mode === 'followers' ? 'Pengikut' : 'Mengikuti'}</DialogTitle>
      <DialogBody>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={!data?.items.length}
          emptyTitle="Belum ada"
          emptyDescription={
            mode === 'followers'
              ? 'Belum ada yang mengikuti akun ini.'
              : 'Akun ini belum mengikuti siapa pun.'
          }
        >
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {(data?.items ?? []).map((u: OwnerRef) => (
              <li key={u.username} className="flex items-center gap-2">
                <Link
                  href={profilePath(u.username)}
                  onClick={onClose}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="truncate font-medium">@{u.username}</span>
                  {u.is_official && <OfficialBadge />}
                  <span className="ms-auto shrink-0 text-xs text-neutral-400">
                    {u.type === 'org' ? 'Organisasi' : 'Pengguna'}
                  </span>
                </Link>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => remove.mutate(u.username)}
                    disabled={remove.isPending}
                    title={`Hapus @${u.username} dari pengikut`}
                    aria-label={`Hapus @${u.username} dari pengikut`}
                    className="shrink-0 rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <XMarkIcon className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </QueryState>
      </DialogBody>
    </Dialog>
  )
}
