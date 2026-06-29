'use client'

import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { quotaStatusLine } from '@/lib/assistant/formatQuota'
import type { ChatMessage } from '@/lib/assistant/useAssistantChat'
import type { AssistantPanel } from '@/lib/api/assistant'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import Textarea from '@/shared/Textarea'
import {
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import type { FormEvent, RefObject } from 'react'

const STARTERS = [
  'Bagaimana cara mempublikasikan dataset?',
  'Apa itu Pabrik Data?',
  'Langkah memulai kompetisi pertama saya?',
]

type Props = {
  messages: ChatMessage[]
  question: string
  onQuestionChange: (value: string) => void
  onSubmit: (e?: FormEvent) => void
  onStarterClick?: (text: string) => void
  error?: string | null
  isPending?: boolean
  panel?: AssistantPanel | null
  bottomRef?: RefObject<HTMLDivElement | null>
  compact?: boolean
  emptyHint?: string
  className?: string
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export function AssistantChatPanel({
  messages,
  question,
  onQuestionChange,
  onSubmit,
  onStarterClick,
  error,
  isPending,
  panel,
  bottomRef,
  compact = false,
  emptyHint,
  className,
}: Props) {
  const sendDisabled = panel?.send_disabled ?? false
  const inputDisabled = isPending || sendDisabled

  return (
    <div
      className={clsx(
        'flex flex-col overflow-hidden border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-900',
        compact ? 'rounded-3xl' : 'min-h-[480px] rounded-3xl shadow-sm',
        className,
      )}
    >
      {panel && !compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/80 px-5 py-3 dark:border-neutral-700">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {quotaStatusLine(panel.quota.remaining, panel.quota.limit, panel.quota.reset_at)}
          </p>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
            Mengingat ~{panel.memory.max_context_messages} pesan terakhir
          </p>
        </div>
      )}

      {panel?.send_disabled && panel.warning && (
        <div
          className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-200/80 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30"
          role="alert"
        >
          <div className="flex min-w-0 gap-2">
            <ExclamationTriangleIcon
              className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden
            />
            <p className="text-sm text-amber-900 dark:text-amber-100">{panel.warning}</p>
          </div>
          <Button href="/me/gamification" outline className="!rounded-lg shrink-0 text-xs">
            Upgrade
          </Button>
        </div>
      )}

      <div
        className={clsx(
          'flex-1 space-y-4 overflow-y-auto',
          compact ? 'max-h-[min(50vh,22rem)] p-4' : 'min-h-[320px] p-5 sm:p-6',
        )}
      >
        {messages.length === 0 ? (
          <div
            className={clsx(
              'flex flex-col items-center justify-center text-center',
              compact ? 'py-6' : 'min-h-[280px]',
            )}
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-primary-100 dark:from-sky-950/50 dark:to-primary-950/40">
              <SparklesIcon className="size-6 text-primary-600 dark:text-primary-400" aria-hidden />
            </div>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              {emptyHint ?? 'Tanyakan apa saja tentang PSD — dataset, course, kompetisi, notebook, dan lainnya.'}
            </p>
            {!compact && !sendDisabled && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onStarterClick?.(s)}
                    className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-700 transition hover:border-primary-300 hover:bg-primary-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-primary-700 dark:hover:bg-primary-950/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={`${m.role}-${m.at}-${i}`}
              className={clsx('flex gap-2.5', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              <div
                className={clsx(
                  'flex size-8 shrink-0 items-center justify-center rounded-full',
                  m.role === 'user'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                    : 'bg-gradient-to-br from-sky-100 to-primary-100 text-primary-700 dark:from-sky-950/60 dark:to-primary-950/40 dark:text-primary-300',
                )}
                aria-hidden
              >
                {m.role === 'user' ? (
                  <UserCircleIcon className="size-5" />
                ) : (
                  <SparklesIcon className="size-4" />
                )}
              </div>
              <div className={clsx('min-w-0 max-w-[85%]', m.role === 'user' ? 'text-end' : 'text-start')}>
                <div
                  className={clsx(
                    'inline-block rounded-2xl px-4 py-3 text-start text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'border border-neutral-200/80 bg-neutral-50 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-200',
                  )}
                >
                  {m.role === 'assistant' ? (
                    <SimpleMarkdown
                      content={m.content}
                      className="!space-y-2 [&_a]:text-primary-600 dark:[&_a]:text-primary-400"
                    />
                  ) : (
                    m.content
                  )}
                </div>
                <p className="mt-1 px-1 text-[10px] text-neutral-400 dark:text-neutral-500">{formatTime(m.at)}</p>
              </div>
            </div>
          ))
        )}

        {isPending && (
          <div className="flex gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-primary-100 dark:from-sky-950/60 dark:to-primary-950/40">
              <SparklesIcon className="size-4 animate-pulse text-primary-600 dark:text-primary-400" aria-hidden />
            </div>
            <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/80">
              <span className="inline-flex gap-1" aria-label="Mengetik">
                <span className="size-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:0ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:150ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="border-t border-neutral-200/80 p-4 dark:border-neutral-700"
      >
        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {compact && panel && (
          <p className="mb-2 text-[10px] text-neutral-400 dark:text-neutral-500">
            {quotaStatusLine(panel.quota.remaining, panel.quota.limit, panel.quota.reset_at)}
          </p>
        )}
        <div className="flex gap-2">
          <Textarea
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            placeholder={
              sendDisabled
                ? 'Kuota habis — tunggu reset atau upgrade tier'
                : compact
                  ? 'Tanya tentang halaman ini…'
                  : 'Tulis pertanyaan…'
            }
            rows={compact ? 2 : 2}
            className="min-h-0 flex-1 !rounded-xl"
            disabled={inputDisabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSubmit(e)
              }
            }}
          />
          <ButtonPrimary
            type="submit"
            disabled={inputDisabled || !question.trim()}
            className={compact ? '!px-3' : undefined}
            title={sendDisabled ? 'Kuota habis' : 'Kirim'}
          >
            <PaperAirplaneIcon className="size-4" aria-hidden />
          </ButtonPrimary>
        </div>
        {!compact && panel?.send_disabled && (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Anda masih bisa membuka chat baru, tetapi mengirim pesan menunggu kuota pulih.{' '}
            <Link href="/me/gamification" className="font-medium text-primary-700 hover:underline dark:text-primary-300">
              Lihat cara upgrade
            </Link>
          </p>
        )}
      </form>
    </div>
  )
}
