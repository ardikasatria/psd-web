'use client'

import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { AssetCardChips } from '@/components/features/repos/AssetCardChips'
import { getAssetReadme, assetKindPath } from '@/lib/api/asset'
import type { RepoKind } from '@/types/api'
import { useQuery } from '@tanstack/react-query'
import { SyntheticBadge } from '@/components/common/SyntheticBadge'

type Props = {
  kind: RepoKind
  owner: string
  name: string
  ref: string
  synthetic?: boolean
  generationSpec?: unknown
  isOwner?: boolean
  onEdit?: () => void
}

export function AssetReadmeTab({
  kind,
  owner,
  name,
  ref,
  synthetic,
  generationSpec,
  isOwner,
  onEdit,
}: Props) {
  const kp = assetKindPath(kind)
  const readme = useQuery({
    queryKey: ['asset-readme', kp, owner, name, ref],
    queryFn: () => getAssetReadme(kp, owner, name, ref),
  })

  if (readme.isLoading) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Memuat README…</p>
  }

  if (readme.isError || !readme.data) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500 dark:border-neutral-600">
        README tidak tersedia.
      </p>
    )
  }

  const { body_md, card } = readme.data

  return (
    <div className="space-y-6">
      {synthetic && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="mb-2 flex items-center gap-2">
            <SyntheticBadge />
          </div>
          Dataset buatan untuk eksperimen — bukan data resmi instansi pemerintah.
        </div>
      )}

      {card && Object.keys(card).length > 0 && <AssetCardChips card={card as Record<string, unknown>} />}

      {generationSpec != null && synthetic && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Spesifikasi generator
          </h3>
          <div className="code-viewer">
            <pre className="overflow-x-auto rounded-xl border border-neutral-200/80 bg-neutral-50 p-4 text-xs dark:border-neutral-700 dark:bg-neutral-900/60">
              {JSON.stringify(generationSpec, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {body_md ? (
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <SimpleMarkdown content={body_md} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-600">
          <p className="text-neutral-600 dark:text-neutral-400">
            {isOwner ? 'Belum ada README untuk aset ini.' : 'README belum ditambahkan.'}
          </p>
          {isOwner && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="mt-4 text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
            >
              Tambahkan README
            </button>
          )}
        </div>
      )}
    </div>
  )
}
