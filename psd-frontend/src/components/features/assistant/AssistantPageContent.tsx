'use client'

import { AssistantChatPanel } from '@/components/features/assistant/AssistantChatPanel'
import { AssistantHistorySidebar } from '@/components/features/assistant/AssistantHistorySidebar'
import { useAssistantContext } from '@/lib/assistant/useAssistantContext'
import { useAssistantChat } from '@/lib/assistant/useAssistantChat'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

export function AssistantPageContent() {
  const context = useAssistantContext()
  const chat = useAssistantChat(context, { freshOnMount: true })
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (!chat.isLoggedIn) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-lg items-center px-4 py-16">
        <div className="w-full rounded-3xl border border-neutral-200/80 bg-white p-10 text-center shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-primary-100 dark:from-sky-950/50 dark:to-primary-950/40">
            <SparklesIcon className="size-7 text-primary-600 dark:text-primary-400" aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-50">Asisten PSD</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Masuk untuk bertanya dan menyimpan riwayat chat di akun Anda.
          </p>
          <ButtonPrimary href="/login?next=/assistant" className="mt-6">
            Masuk
          </ButtonPrimary>
        </div>
      </div>
    )
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Hapus percakapan ini dari riwayat?')) return
    setDeletingId(id)
    try {
      await chat.removeConversation(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:py-10">
      <div className="relative overflow-hidden rounded-3xl border border-neutral-200/80 bg-gradient-to-br from-sky-50 via-white to-primary-50 p-6 sm:p-8 dark:border-neutral-700 dark:from-sky-950/30 dark:via-neutral-900 dark:to-primary-950/20">
        <div
          className="pointer-events-none absolute -end-16 -top-16 size-48 rounded-full bg-primary-200/30 blur-3xl dark:bg-primary-800/20"
          aria-hidden
        />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-800 shadow-sm dark:bg-neutral-800/80 dark:text-primary-300">
            <SparklesIcon className="size-3.5" aria-hidden />
            AI Asisten
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Asisten PSD</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
            Tanya cara pakai fitur platform — dijawab dalam Bahasa Indonesia. Riwayat tersimpan di sidebar kanan;
            refresh halaman memulai chat baru.
            {context.fitur && (
              <>
                {' '}
                Konteks halaman:{' '}
                <strong className="text-neutral-800 dark:text-neutral-200">{context.fitur}</strong>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] lg:items-stretch">
        <AssistantChatPanel
          messages={chat.messages}
          question={chat.question}
          onQuestionChange={chat.setQuestion}
          onSubmit={chat.handleSubmit}
          onStarterClick={chat.setQuestion}
          error={chat.error}
          isPending={chat.sendMutation.isPending}
          panel={chat.panel.data ?? null}
          bottomRef={chat.bottomRef}
        />

        <AssistantHistorySidebar
          className="min-h-[480px] lg:sticky lg:top-28"
          conversations={chat.conversations.data ?? []}
          activeId={chat.activeId}
          isLoading={chat.conversations.isLoading || !chat.bootstrapped}
          deletingId={deletingId}
          onSelect={(conv) => void chat.loadConversation(conv)}
          onNew={() => void chat.startNewChat()}
          onDelete={(id) => void handleDelete(id)}
        />
      </div>
    </div>
  )
}
