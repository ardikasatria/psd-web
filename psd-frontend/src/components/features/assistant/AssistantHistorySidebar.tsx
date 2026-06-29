'use client'

import type { AssistantConversation } from '@/lib/api/assistant'
import { Button } from '@/shared/Button'
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

function formatUpdated(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

type Props = {
  conversations: AssistantConversation[]
  activeId: string | null
  onSelect: (conv: AssistantConversation) => void
  onNew: () => void
  onDelete: (id: string) => void
  isLoading?: boolean
  deletingId?: string | null
  className?: string
}

export function AssistantHistorySidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isLoading,
  deletingId,
  className,
}: Props) {
  return (
    <aside
      className={clsx(
        'flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-900',
        className,
      )}
      aria-label="Riwayat chat"
    >
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200/80 px-4 py-3 dark:border-neutral-700">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          <ChatBubbleLeftRightIcon className="size-4 text-primary-600 dark:text-primary-400" aria-hidden />
          Riwayat
        </div>
        <Button type="button" outline className="!rounded-lg !px-2.5 !py-1.5 text-xs" onClick={onNew}>
          <PlusIcon className="size-3.5" data-slot="icon" aria-hidden />
          Baru
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
            Belum ada percakapan. Mulai chat baru untuk menyimpan riwayat.
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conv) => {
              const active = conv.id === activeId
              return (
                <li key={conv.id}>
                  <div
                    className={clsx(
                      'group flex items-stretch gap-1 rounded-xl motion-safe:transition-colors',
                      active
                        ? 'bg-primary-50 ring-1 ring-primary-200/80 dark:bg-primary-950/30 dark:ring-primary-800/60'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/70',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(conv)}
                      className="min-w-0 flex-1 px-3 py-2.5 text-start"
                    >
                      <p
                        className={clsx(
                          'truncate text-sm font-medium',
                          active
                            ? 'text-primary-900 dark:text-primary-100'
                            : 'text-neutral-800 dark:text-neutral-200',
                        )}
                      >
                        {conv.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                        {formatUpdated(conv.updated_at)}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(conv.id)}
                      disabled={deletingId === conv.id}
                      className="shrink-0 rounded-e-xl px-2 text-neutral-400 opacity-0 motion-safe:transition-opacity hover:text-red-600 group-hover:opacity-100 dark:hover:text-red-400"
                      aria-label={`Hapus ${conv.title}`}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
