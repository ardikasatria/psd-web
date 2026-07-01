'use client'

import { RepoKind } from '@/types/api'
import clsx from 'clsx'
import Link from 'next/link'
import {
  BeakerIcon,
  CodeBracketSquareIcon,
  CubeIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'

const KIND_META: Record<
  RepoKind,
  { label: string; href: string; icon: typeof FolderIcon; accent: string }
> = {
  project: {
    label: 'Proyek',
    href: '/projects',
    icon: FolderIcon,
    accent: 'from-primary-500 to-rose-500',
  },
  dataset: {
    label: 'Dataset',
    href: '/datasets',
    icon: CubeIcon,
    accent: 'from-blue-500 to-indigo-600',
  },
  model: {
    label: 'Model',
    href: '/models',
    icon: BeakerIcon,
    accent: 'from-violet-500 to-purple-600',
  },
}

type Props = {
  counts: Partial<Record<RepoKind, number>>
  notebookCount?: number
  loading?: boolean
}

export function ExploreStatsStrip({ counts, notebookCount, loading }: Props) {
  const items = [
    ...(['project', 'dataset', 'model'] as RepoKind[]).map((kind) => ({
      key: kind,
      ...KIND_META[kind],
      total: counts[kind],
    })),
    {
      key: 'notebook',
      label: 'Notebook',
      href: '/notebooks',
      icon: CodeBracketSquareIcon,
      accent: 'from-sky-500 to-indigo-600',
      total: notebookCount,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ key, label, href, icon: Icon, accent, total }) => (
        <Link
          key={key}
          href={href}
          className={clsx(
            'group flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 transition-all',
            'hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md',
            'dark:border-neutral-700 dark:bg-neutral-800/90 dark:hover:border-primary-800',
          )}
        >
          <div
            className={clsx(
              'flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
              accent,
            )}
          >
            <Icon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className="text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-50">
              {loading ? '…' : (total ?? 0).toLocaleString('id-ID')}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
