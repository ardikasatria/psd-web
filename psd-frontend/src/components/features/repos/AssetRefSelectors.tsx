'use client'

import type { AssetBranch, AssetVersion } from '@/types/api'
import clsx from 'clsx'

type Props = {
  refValue: string
  onRefChange: (ref: string) => void
  branches: AssetBranch[]
  versions: AssetVersion[]
  className?: string
}

export function AssetRefSelectors({ refValue, onRefChange, branches, versions, className }: Props) {
  const defaultBranch = branches.find((b) => b.is_default)?.name ?? branches[0]?.name ?? 'main'

  return (
    <div className={clsx('flex flex-wrap items-center gap-2', className)}>
      <label className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
        Branch
        <select
          value={branches.some((b) => b.name === refValue) ? refValue : defaultBranch}
          onChange={(e) => onRefChange(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        >
          {branches.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
              {b.is_default ? ' (default)' : ''}
            </option>
          ))}
        </select>
      </label>

      {versions.length > 0 && (
        <label className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          Versi
          <select
            value={versions.some((v) => v.tag === refValue) ? refValue : ''}
            onChange={(e) => e.target.value && onRefChange(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="">— pilih tag —</option>
            {versions.map((v) => (
              <option key={v.tag} value={v.tag}>
                {v.tag}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
