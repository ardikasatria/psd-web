'use client'

import Image from 'next/image'

export function CompetitionCoverHero({ coverUrl, title }: { coverUrl?: string | null; title: string }) {
  return (
    <div className="relative -mx-4 mb-6 aspect-[21/9] overflow-hidden rounded-2xl sm:mx-0 sm:aspect-[3/1]">
      {coverUrl ? (
        <Image src={coverUrl} alt="" fill className="object-cover" unoptimized priority />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-primary-500 to-primary-700" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Kompetisi</p>
        <h2 className="mt-1 line-clamp-2 text-xl font-bold text-white sm:text-2xl">{title}</h2>
      </div>
    </div>
  )
}
