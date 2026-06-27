'use client'

import type { Collection } from '@/types/api'
import { RectangleStackIcon, SparklesIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

const ACCENTS = [
  'from-violet-400 to-indigo-500',
  'from-indigo-400 to-sky-500',
  'from-sky-400 to-cyan-500',
  'from-primary-400 to-violet-500',
] as const

export function CollectionCard({ collection, index = 0 }: { collection: Collection; index?: number }) {
  const accent = ACCENTS[index % ACCENTS.length]
  const [coverFailed, setCoverFailed] = useState(false)
  const showCover = collection.cover_url && !coverFailed

  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800"
    >
      <div className={clsx('h-1 w-full bg-gradient-to-r', accent)} />
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {showCover ? (
          <Image
            src={collection.cover_url!}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            unoptimized
            onError={() => setCoverFailed(true)}
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        ) : (
          <div className={clsx('absolute inset-0 bg-gradient-to-br', accent)}>
            <div className="absolute inset-0 opacity-30">
              <div className="absolute -end-8 -top-8 size-32 rounded-full bg-white/20 blur-2xl" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <RectangleStackIcon className="size-10 text-white/40" aria-hidden />
            </div>
          </div>
        )}
        {collection.is_featured && (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-700 shadow-sm dark:bg-neutral-900/90 dark:text-primary-300">
            <SparklesIcon className="size-3" aria-hidden />
            Unggulan
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
          {collection.title}
        </h3>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {collection.count} aset kurasi
        </p>
      </div>
    </Link>
  )
}
