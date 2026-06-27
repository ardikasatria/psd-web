'use client'

import { SidebarStatTile, sidebarCalloutClass, sidebarSectionClass, sidebarTipClass } from '@/components/common/SidebarStatTile'
import type { Collection } from '@/types/api'
import { getTransformerHub, listCollections } from '@/lib/api/collections'
import {
  ArrowRightIcon,
  BeakerIcon,
  CircleStackIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  RectangleStackIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

const CURATION_TIPS = [
  'Mulai dari koleksi unggulan — sudah disaring tim humas untuk pemula Transformer.',
  'Model IndoBERT dan sejenisnya cocok untuk teks berbahasa Indonesia sebelum eksperimen model global.',
  'Gabungkan dataset ulasan/teks lokal dengan notebook fine-tuning untuk pipeline lengkap.',
  'Bookmark koleksi favorit — kurasi akan terus bertambah seiring kontribusi komunitas.',
]

type Props = {
  className?: string
  onCreateClick?: () => void
}

export function TransformerSidebar({ className, onCreateClick }: Props) {
  const tip = CURATION_TIPS[new Date().getDate() % CURATION_TIPS.length]

  const hub = useQuery({
    queryKey: ['transformer-hub', 'sidebar'],
    queryFn: getTransformerHub,
    staleTime: 60_000,
  })

  const allCollections = useQuery({
    queryKey: ['collections', 'sidebar-stats'],
    queryFn: () => listCollections({ page: 1 }),
    staleTime: 60_000,
  })

  const featured = hub.data?.collections ?? []
  const totalCollections = allCollections.data?.total ?? featured.length
  const modelCount = hub.data?.models.length ?? 0
  const datasetCount = hub.data?.datasets.length ?? 0
  const notebookCount = hub.data?.notebooks.length ?? 0

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-2 gap-2">
        <SidebarStatTile label="Koleksi" value={totalCollections} icon={<RectangleStackIcon className="size-4" />} />
        <SidebarStatTile label="Model" value={modelCount} icon={<BeakerIcon className="size-4" />} accent="sky" />
        <SidebarStatTile label="Dataset" value={datasetCount} icon={<CircleStackIcon className="size-4" />} accent="indigo" />
        <SidebarStatTile label="Notebook" value={notebookCount} icon={<CodeBracketSquareIcon className="size-4" />} accent="violet" />
      </div>

      {featured.length > 0 && (
        <div className={sidebarSectionClass}>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
            <SparklesIcon className="size-3.5" aria-hidden />
            Koleksi unggulan
          </div>
          <ul className="space-y-2">
            {featured.slice(0, 3).map((c: Collection) => (
              <li key={c.slug}>
                <Link
                  href={`/collections/${c.slug}`}
                  className="block rounded-xl border border-neutral-200/80 bg-white/80 px-3 py-2.5 text-sm transition hover:border-primary-200 hover:bg-primary-50/50 dark:border-neutral-700 dark:bg-neutral-800/80 dark:hover:border-neutral-600"
                >
                  <span className="line-clamp-1 font-medium text-neutral-900 dark:text-neutral-100">{c.title}</span>
                  <span className="text-xs text-neutral-500">{c.count} aset</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={sidebarCalloutClass}>
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <CpuChipIcon className="size-4 text-primary-600 dark:text-primary-400" aria-hidden />
          Tips kurasi
        </div>
        <p className={sidebarTipClass}>{tip}</p>
      </div>

      <Link
        href="/collections"
        className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-primary-200 hover:text-primary-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-primary-800"
      >
        Semua koleksi
        <ArrowRightIcon className="size-4" aria-hidden />
      </Link>

      {onCreateClick && (
        <button
          type="button"
          onClick={onCreateClick}
          className="w-full rounded-2xl border border-dashed border-primary-300 bg-primary-50/50 px-4 py-3 text-sm font-medium text-primary-700 transition hover:bg-primary-50 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-300"
        >
          + Buat koleksi (staf)
        </button>
      )}
    </aside>
  )
}
