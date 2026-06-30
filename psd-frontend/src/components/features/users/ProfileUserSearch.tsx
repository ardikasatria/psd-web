'use client'

import { searchUserProfile } from '@/lib/api/users'
import type { ProfileSearchItem } from '@/types/api'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import { QueryState } from '@/components/features/QueryState'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const KIND_COLORS: Record<string, 'blue' | 'green' | 'purple' | 'zinc' | 'yellow' | 'orange'> = {
  project: 'blue',
  dataset: 'green',
  model: 'purple',
  post: 'orange',
  thread: 'yellow',
  notebook: 'zinc',
}

export function ProfileUserSearch({
  username,
  onSearchingChange,
}: {
  username: string
  onSearchingChange?: (active: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const active = debounced.length >= 2

  useEffect(() => {
    onSearchingChange?.(active)
  }, [active, onSearchingChange])

  const search = useQuery({
    queryKey: ['profile-search', username, debounced],
    queryFn: () => searchUserProfile(username, debounced),
    enabled: active,
  })

  return (
    <div className="mb-6 space-y-4">
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault()
          setDebounced(query.trim())
        }}
      >
        <MagnifyingGlassIcon
          className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-neutral-400"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari di profil ini — proyek, dataset, postingan, diskusi…"
          className="!rounded-xl !py-2.5 !ps-10 !pe-10 text-sm"
          aria-label={`Cari konten @${username}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setDebounced('')
            }}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Hapus pencarian"
          >
            <XMarkIcon className="size-4" />
          </button>
        )}
      </form>

      {active && (
        <QueryState isLoading={search.isLoading} isError={search.isError} error={search.error}>
          {(search.data?.items ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              Tidak ada hasil untuk &ldquo;{debounced}&rdquo; di profil ini.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {search.data?.total ?? 0} hasil untuk &ldquo;{debounced}&rdquo;
              </p>
              <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900/50">
                {(search.data?.items ?? []).map((item: ProfileSearchItem) => (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    href={item.href}
                    className={clsx(
                      'block px-4 py-3 transition-colors',
                      'hover:bg-neutral-50 dark:hover:bg-neutral-800/60',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color={KIND_COLORS[item.kind] ?? 'zinc'}>{item.kind_label}</Badge>
                      <span className="min-w-0 flex-1 font-medium text-neutral-900 dark:text-neutral-100">
                        {item.title}
                      </span>
                      <time className="text-xs text-neutral-400" dateTime={item.created_at}>
                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </time>
                    </div>
                    {item.preview && (
                      <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                        {item.preview}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </QueryState>
      )}
    </div>
  )
}
