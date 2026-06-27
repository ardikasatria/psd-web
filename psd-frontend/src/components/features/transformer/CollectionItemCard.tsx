'use client'

import type { CollectionItem } from '@/types/api'
import {
  BeakerIcon,
  CircleStackIcon,
  CodeBracketSquareIcon,
  FolderIcon,
  HeartIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

const TYPE_META = {
  model: { icon: BeakerIcon, href: (slug: string) => `/models/${slug}`, label: 'Model', accent: 'from-violet-400 to-indigo-500' },
  dataset: { icon: CircleStackIcon, href: (slug: string) => `/datasets/${slug}`, label: 'Dataset', accent: 'from-sky-400 to-indigo-500' },
  project: { icon: FolderIcon, href: (slug: string) => `/projects/${slug}`, label: 'Proyek', accent: 'from-emerald-400 to-teal-500' },
  notebook: { icon: CodeBracketSquareIcon, href: (id: string) => `/notebooks/${id}`, label: 'Notebook', accent: 'from-indigo-400 to-violet-500' },
} as const

export function CollectionItemCard({ item }: { item: CollectionItem }) {
  const meta = TYPE_META[item.type]
  const Icon = meta.icon
  const href =
    item.type === 'notebook' ? meta.href(item.id) : meta.href((item as { slug: string }).slug)
  const title = item.type === 'notebook' ? item.title : item.name

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800"
    >
      <div className={clsx('h-1 bg-gradient-to-r', meta.accent)} />
      <div className="flex flex-1 gap-4 p-4">
        <div className={clsx('flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white', meta.accent)}>
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{meta.label}</span>
          <h3 className="mt-0.5 line-clamp-2 font-medium text-neutral-900 group-hover:text-primary-600 dark:text-neutral-100">
            {title}
          </h3>
          {item.type !== 'notebook' && (
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span>@{item.owner}</span>
              <span className="inline-flex items-center gap-0.5">
                <HeartIcon className="size-3" aria-hidden />
                {item.likes}
              </span>
              <span>{item.downloads.toLocaleString('id-ID')} unduhan</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
