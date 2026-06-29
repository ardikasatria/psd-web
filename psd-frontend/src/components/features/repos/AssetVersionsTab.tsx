'use client'

import { assetKindPath, getAssetVersions } from '@/lib/api/asset'
import type { RepoKind } from '@/types/api'
import { ArrowDownTrayIcon, TagIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/shared/Button'

type Props = {
  kind: RepoKind
  owner: string
  name: string
  onCheckout: (tag: string) => void
}

export function AssetVersionsTab({ kind, owner, name, onCheckout }: Props) {
  const kp = assetKindPath(kind)
  const versions = useQuery({
    queryKey: ['asset-versions', kp, owner, name],
    queryFn: () => getAssetVersions(kp, owner, name),
  })

  if (versions.isLoading) return <p className="text-sm text-neutral-500">Memuat versi…</p>

  if (!versions.data?.length) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500 dark:border-neutral-600">
        Belum ada tag versi untuk aset ini.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200/80 dark:divide-neutral-800 dark:border-neutral-700">
      {versions.data.map((v) => (
        <li key={v.tag} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
              <TagIcon className="size-4" aria-hidden />
            </span>
            <div>
              <p className="font-mono text-sm font-semibold text-neutral-900 dark:text-neutral-100">{v.tag}</p>
              {v.name && <p className="text-xs text-neutral-500 dark:text-neutral-400">{v.name}</p>}
              {v.created_at && (
                <p className="text-[10px] text-neutral-400">
                  {new Date(v.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" outline onClick={() => onCheckout(v.tag)}>
              Checkout
            </Button>
            {v.download_url && (
              <Button href={v.download_url} target="_blank" rel="noopener noreferrer" outline>
                <ArrowDownTrayIcon className="size-4" data-slot="icon" aria-hidden />
                Unduh
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
