'use client'

import Image from 'next/image'
import { useState } from 'react'
import clsx from 'clsx'

export function EventCoverHero({ coverUrl, title }: { coverUrl?: string | null; title: string }) {
  return (
    <div className="relative aspect-[21/9] overflow-hidden rounded-2xl sm:aspect-[3/1]">
      {coverUrl ? (
        <Image src={coverUrl} alt="" fill className="object-cover" unoptimized priority />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Event</p>
        <h2 className="mt-1 line-clamp-2 text-xl font-bold text-white sm:text-2xl">{title}</h2>
      </div>
    </div>
  )
}

export function EventMediaCarousel({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0)
  if (!urls.length) return null

  return (
    <div className="mt-6">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
        <Image src={urls[index]!} alt="" fill className="object-cover" unoptimized />
      </div>
      {urls.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setIndex(i)}
              className={clsx(
                'relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition',
                i === index ? 'border-primary-500' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <Image src={url} alt="" fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
