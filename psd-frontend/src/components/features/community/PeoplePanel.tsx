'use client'

import { PersonRow } from '@/components/features/community/PersonRow'
import type { DiscoveryKind } from '@/lib/api/discovery'
import type { DiscoveryRef } from '@/types/api'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useState } from 'react'

const MAX_ROWS = 5

type Props = {
  title: string
  kind: DiscoveryKind
  items: DiscoveryRef[]
  className?: string
}

export function PeoplePanel({ title, kind, items, className }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const visible = items.filter((p) => !hidden.has(p.username)).slice(0, MAX_ROWS)

  if (visible.length === 0) return null

  return (
    <section
      className={clsx(
        'rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
        <Link
          href={`/community/discovery/${kind}`}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Lihat semua
          <ChevronRightIcon className="size-3.5" aria-hidden />
        </Link>
      </div>

      <ul className="mt-3 space-y-0.5">
        {visible.map((person) => (
          <PersonRow
            key={person.username}
            person={person}
            onFollowed={(username) => setHidden((prev) => new Set(prev).add(username))}
          />
        ))}
      </ul>
    </section>
  )
}
