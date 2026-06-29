'use client'

import { assetKindPath, getAssetContributors } from '@/lib/api/asset'
import { profilePath } from '@/lib/routes/profile'
import type { RepoKind } from '@/types/api'
import { Badge } from '@/shared/Badge'
import { UserCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

type Props = {
  kind: RepoKind
  owner: string
  name: string
}

export function AssetContributorsTab({ kind, owner, name }: Props) {
  const kp = assetKindPath(kind)
  const contributors = useQuery({
    queryKey: ['asset-contributors', kp, owner, name],
    queryFn: () => getAssetContributors(kp, owner, name),
  })

  if (contributors.isLoading) return <p className="text-sm text-neutral-500">Memuat kontributor…</p>

  if (!contributors.data?.length) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500 dark:border-neutral-600">
        Belum ada data kontributor.
      </p>
    )
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {contributors.data.map((c) => (
        <li
          key={c.username}
          className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-neutral-50/50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/30"
        >
          {c.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.avatar_url} alt="" className="size-10 rounded-full object-cover" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
              <UserCircleIcon className="size-6 text-neutral-500" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={profilePath(c.username)}
                className="font-medium text-neutral-900 hover:text-primary-700 dark:text-neutral-100 dark:hover:text-primary-300"
              >
                @{c.username}
              </Link>
              {c.is_team_member && (
                <Badge color="sky">{c.team ? `Tim · ${c.team}` : 'Tim'}</Badge>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{c.commits} commit</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
