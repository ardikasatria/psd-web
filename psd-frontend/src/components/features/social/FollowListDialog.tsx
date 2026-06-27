'use client'

import { getFollowers, getFollowing } from '@/lib/api/social'
import { profilePath } from '@/lib/routes/profile'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { QueryState } from '@/components/features/QueryState'
import { Dialog, DialogBody, DialogTitle } from '@/shared/dialog'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { OwnerRef, SocialComment } from '@/types/api'

export function FollowListDialog({
  username,
  mode,
  open,
  onClose,
}: {
  username: string
  mode: 'followers' | 'following'
  open: boolean
  onClose: () => void
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [mode, username],
    queryFn: () => (mode === 'followers' ? getFollowers(username) : getFollowing(username)),
    enabled: open,
  })

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
              <li key={u.username}>
                <Link
                  href={profilePath(u.username)}
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="font-medium">@{u.username}</span>
                  {u.is_official && <OfficialBadge className="!text-[10px]" />}
                  <span className="ms-auto text-xs text-neutral-400">{u.type === 'org' ? 'Organisasi' : 'Pengguna'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </QueryState>
      </DialogBody>
    </Dialog>
  )
}
