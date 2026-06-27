'use client'

import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { getAnnouncements } from '@/lib/api/announcements'
import { Announcement } from '@/types/api'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { InformationCircleIcon, MegaphoneIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'psd-dismissed-announcements'

function loadDismissed(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function dismiss(id: string) {
  const next = [...new Set([...loadDismissed(), id])]
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function AnnouncementBanner({ className }: { className?: string }) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const { data } = useQuery({
    queryKey: ['announcements'],
    queryFn: getAnnouncements,
  })

  useEffect(() => {
    setDismissed(loadDismissed())
  }, [])

  const visible = (data ?? []).find((a: Announcement) => !dismissed.includes(a.id))
  if (!visible) return null

  const isImportant = visible.level === 'penting'

  return (
    <div
      className={clsx(
        'relative rounded-2xl border px-4 py-4 sm:px-5',
        isImportant
          ? 'border-amber-300/80 bg-gradient-to-r from-amber-50 to-orange-50 dark:border-amber-700/50 dark:from-amber-950/40 dark:to-orange-950/30'
          : 'border-primary-200/80 bg-primary-50/80 dark:border-primary-800/50 dark:bg-primary-950/30',
        className
      )}
      role="status"
    >
      <div className="flex gap-3 pe-8">
        {isImportant ? (
          <MegaphoneIcon className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        ) : (
          <InformationCircleIcon className="mt-0.5 size-5 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className={clsx('font-semibold', isImportant ? 'text-amber-900 dark:text-amber-100' : 'text-primary-900 dark:text-primary-100')}>
            {visible.title}
          </p>
          <SimpleMarkdown content={visible.body_md} className="mt-1.5" />
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          dismiss(visible.id)
          setDismissed((prev) => [...prev, visible.id])
        }}
        className="absolute end-3 top-3 rounded-lg p-1 text-neutral-500 hover:bg-black/5 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-neutral-200"
        aria-label="Tutup pengumuman"
      >
        <XMarkIcon className="size-5" />
      </button>
    </div>
  )
}
