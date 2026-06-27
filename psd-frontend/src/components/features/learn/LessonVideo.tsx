'use client'

import { PlayCircleIcon } from '@heroicons/react/24/outline'
import { getVideoEmbed } from './learnUtils'

export function LessonVideo({ url, title }: { url: string | null | undefined; title: string }) {
  const embed = url ? getVideoEmbed(url) : null

  if (!embed) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800/50">
        <div className="text-center text-neutral-400">
          <PlayCircleIcon className="mx-auto size-12 opacity-40" />
          <p className="mt-2 text-sm">Belum ada video untuk pelajaran ini</p>
        </div>
      </div>
    )
  }

  if (embed.type === 'video') {
    return (
      <div className="overflow-hidden rounded-xl bg-neutral-900 shadow-lg ring-1 ring-neutral-900/10 dark:ring-white/10">
        <video src={embed.src} controls className="aspect-video w-full" title={title}>
          Browser Anda tidak mendukung pemutar video.
        </video>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl bg-neutral-900 shadow-lg ring-1 ring-neutral-900/10 dark:ring-white/10">
      <div className="relative aspect-video">
        <iframe
          src={embed.src}
          title={title}
          className="absolute inset-0 size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}
