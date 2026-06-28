'use client'

import { useAssistantContext } from '@/lib/assistant/useAssistantContext'
import { askAssistant, getAssistantQuota, type AskResult } from '@/lib/api/assistant'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Textarea from '@/shared/Textarea'
import {
  ArrowTopRightOnSquareIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { FormEvent, useEffect, useRef, useState } from 'react'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export function AssistantFab() {
  const context = useAssistantContext()
  const qc = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)

  const quota = useQuery({
    queryKey: ['assistant-quota'],
    queryFn: getAssistantQuota,
    enabled: open,
  })

  const askMutation = useMutation({
    mutationFn: (q: string) => askAssistant({ question: q, context }),
    onSuccess: (res: AskResult, q) => {
      setError(null)
      setMessages((prev) => [...prev, { role: 'user', content: q }, { role: 'assistant', content: res.reply }])
      setQuestion('')
      qc.invalidateQueries({ queryKey: ['assistant-quota'] })
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    },
    onError: (e: Error) => setError(e.message),
  })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || askMutation.isPending) return
    askMutation.mutate(q)
  }

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
              'flex w-[min(100vw-2rem,24rem)] flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900',
              'max-h-[min(70vh,32rem)]',
            )}
            role="dialog"
            aria-label="Asisten PSD"
          >
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200/80 px-4 py-3 dark:border-neutral-700">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                  <SparklesIcon className="size-4 text-sky-600 dark:text-sky-400" aria-hidden />
                  Asisten PSD
                </div>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  Konteks: <span className="text-neutral-700 dark:text-neutral-300">{contextLabel}</span>
                </p>
                {quota.data && (
                  <p className="mt-1 text-[10px] text-neutral-400">
                    Kuota ({quota.data.tier}): {quota.data.remaining}/{quota.data.limit}
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

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Tanya singkat tentang halaman ini — asisten memahami konteks fitur yang sedang Anda buka.
                </p>
              ) : (
                messages.map((m, i) => (
                  <div key={`${m.role}-${i}`} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={clsx(
                        'max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                        m.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'border border-neutral-200/80 bg-neutral-50 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSubmit} className="border-t border-neutral-200/80 p-3 dark:border-neutral-700">
              {error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-2">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Tanya tentang halaman ini…"
                  rows={2}
                  className="min-h-0 flex-1 !rounded-xl text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                />
                <ButtonPrimary type="submit" disabled={askMutation.isPending || !question.trim()} className="!px-3">
                  <PaperAirplaneIcon className="size-4" aria-hidden />
                </ButtonPrimary>
              </div>
              <Link
                href="/assistant"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline dark:text-sky-300"
                onClick={() => setOpen(false)}
              >
                Buka asisten lengkap
                <ArrowTopRightOnSquareIcon className="size-3.5" aria-hidden />
              </Link>
            </form>
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
