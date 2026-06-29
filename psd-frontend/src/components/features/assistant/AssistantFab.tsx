'use client'

import { AssistantChatPanel } from '@/components/features/assistant/AssistantChatPanel'
import { useAssistantContext } from '@/lib/assistant/useAssistantContext'
import { useAssistantChat } from '@/lib/assistant/useAssistantChat'
import {
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function AssistantFab() {
  const context = useAssistantContext()
  const chat = useAssistantChat(context)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const contextLabel = context.fitur ?? context.halaman

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-neutral-900/30 backdrop-blur-[1px] dark:bg-black/50"
          aria-label="Tutup asisten"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed end-4 bottom-24 z-50 flex flex-col items-end gap-3 sm:end-6">
        {open && (
          <div
            className={clsx(
              'flex w-[min(100vw-2rem,26rem)] flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900',
              'max-h-[min(75vh,36rem)]',
            )}
            role="dialog"
            aria-label="Asisten PSD"
          >
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200/80 px-4 py-3 dark:border-neutral-700">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                  <SparklesIcon className="size-4 text-primary-600 dark:text-primary-400" aria-hidden />
                  Asisten PSD
                </div>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  Konteks: <span className="text-neutral-700 dark:text-neutral-300">{contextLabel}</span>
                </p>
                {chat.quota.data && (
                  <p className="mt-1 text-[10px] text-neutral-400">
                    Kuota ({chat.quota.data.tier}): {chat.quota.data.remaining}/{chat.quota.data.limit}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Tutup"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>

            <AssistantChatPanel
              compact
              messages={chat.messages}
              question={chat.question}
              onQuestionChange={chat.setQuestion}
              onSubmit={chat.handleSubmit}
              onClear={chat.clearHistory}
              error={chat.error}
              isPending={chat.askMutation.isPending}
              bottomRef={chat.bottomRef}
              emptyHint="Tanya singkat tentang halaman ini — riwayat tersimpan di perangkat Anda."
              className="!rounded-none !border-0 shadow-none"
            />

            <div className="border-t border-neutral-200/80 px-4 py-2 dark:border-neutral-700">
              <Link
                href="/assistant"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline dark:text-primary-300"
                onClick={() => setOpen(false)}
              >
                Buka asisten lengkap
                <ArrowTopRightOnSquareIcon className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={clsx(
            'inline-flex size-14 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition-[transform,box-shadow,filter] duration-200',
            'hover:scale-105 hover:brightness-105 active:scale-95',
            open
              ? 'bg-neutral-800 shadow-neutral-900/25 dark:bg-neutral-700'
              : [
                  'bg-[linear-gradient(135deg,#f19090_0%,#c6899a_23%,#687ab0_76%,#4375ba_100%)]',
                  'shadow-[#4375ba]/30',
                  'dark:[background-image:none] dark:bg-neutral-800 dark:shadow-neutral-900/30 dark:hover:bg-neutral-700',
                ],
          )}
          aria-expanded={open}
          aria-label={open ? 'Tutup asisten PSD' : 'Buka asisten PSD'}
        >
          {open ? <XMarkIcon className="size-6" aria-hidden /> : <SparklesIcon className="size-6" aria-hidden />}
        </button>
      </div>
    </>
  )
}
