'use client'

import { CodeBlock } from '@/components/features/repos/CodeBlock'
import { assetKindPath, getAssetFile, getAssetTree } from '@/lib/api/asset'
import type { RepoKind } from '@/types/api'
import type { TreeNode } from '@/lib/asset/buildTree'
import clsx from 'clsx'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRightIcon, DocumentIcon, FolderIcon } from '@heroicons/react/24/outline'

function TreeList({
  nodes,
  selected,
  onSelect,
  depth = 0,
}: {
  nodes: TreeNode[]
  selected: string | null
  onSelect: (path: string) => void
  depth?: number
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        const path = node.path ?? node.name
        const isDir = node.type === 'dir'
        return (
          <li key={path}>
            <button
              type="button"
              onClick={() => !isDir && onSelect(path)}
              className={clsx(
                'flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-start text-xs font-mono motion-safe:transition-colors',
                !isDir && selected === path
                  ? 'bg-primary-50 text-primary-800 dark:bg-primary-950/40 dark:text-primary-200'
                  : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                isDir && 'cursor-default font-sans font-medium text-neutral-500',
              )}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {isDir ? (
                <FolderIcon className="size-3.5 shrink-0 text-amber-500" aria-hidden />
              ) : (
                <DocumentIcon className="size-3.5 shrink-0 text-neutral-400" aria-hidden />
              )}
              <span className="truncate">{node.name}</span>
              {isDir && <ChevronRightIcon className="ms-auto size-3 text-neutral-400" aria-hidden />}
            </button>
            {node.children && node.children.length > 0 && (
              <TreeList nodes={node.children as TreeNode[]} selected={selected} onSelect={onSelect} depth={depth + 1} />
            )}
          </li>
        )
      })}
    </ul>
  )
}

type Props = {
  kind: RepoKind
  owner: string
  name: string
  ref: string
  hasGit?: boolean
  legacyPanel?: React.ReactNode
}

export function AssetFilesTab({ kind, owner, name, ref, hasGit, legacyPanel }: Props) {
  const kp = assetKindPath(kind)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  const tree = useQuery({
    queryKey: ['asset-tree', kp, owner, name, ref],
    queryFn: () => getAssetTree(kp, owner, name, ref),
    enabled: hasGit !== false,
  })

  const file = useQuery({
    queryKey: ['asset-file', kp, owner, name, ref, selectedPath],
    queryFn: () => getAssetFile(kp, owner, name, selectedPath!, ref),
    enabled: Boolean(selectedPath),
  })

  if (!hasGit && legacyPanel) {
    return <>{legacyPanel}</>
  }

  if (tree.isLoading) {
    return <p className="text-sm text-neutral-500">Memuat pohon berkas…</p>
  }

  if (tree.isError || !tree.data) {
    return legacyPanel ?? <p className="text-sm text-red-600 dark:text-red-400">Gagal memuat berkas.</p>
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
      <div className="max-h-[28rem] overflow-y-auto rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-2 dark:border-neutral-700 dark:bg-neutral-900/40">
        <TreeList
          nodes={tree.data.tree as TreeNode[]}
          selected={selectedPath}
          onSelect={setSelectedPath}
        />
      </div>

      <div className="min-h-[12rem] rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/30">
        {!selectedPath ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Pilih berkas untuk melihat isinya.</p>
        ) : file.isLoading ? (
          <p className="text-sm text-neutral-500">Memuat berkas…</p>
        ) : file.data ? (
          <div className="space-y-3">
            <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{file.data.path}</p>
            <CodeBlock
              code={file.data.content ?? ''}
              filename={file.data.path}
              language={file.data.language}
              downloadUrl={file.data.download_url}
            />
          </div>
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400">Gagal memuat berkas.</p>
        )}
      </div>
    </div>
  )
}
