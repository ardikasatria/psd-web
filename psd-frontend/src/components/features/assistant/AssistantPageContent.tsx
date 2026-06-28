'use client'

import { PersonalizedFeedSection } from '@/components/features/assistant/PersonalizedFeedSection'
import { FeaturePageShell } from '@/components/features/layout'
import { askAssistant, getAssistantQuota, type AskResult } from '@/lib/api/assistant'
import { useAuth } from '@/lib/auth/useAuth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import Textarea from '@/shared/Textarea'
import { PaperAirplaneIcon, SparklesIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { FormEvent, useRef, useState } from 'react'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const STARTERS = [
  'Bagaimana cara mempublikasikan dataset?',
  'Apa itu Pabrik Data?',
  'Langkah memulai kompetisi pertama saya?',
]

export function AssistantPageContent() {
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)

  const quota = useQuery({
    queryKey: ['assistant-quota'],
    queryFn: getAssistantQuota,
    enabled: isLoggedIn,
  })

  const askMutation = useMutation({
    mutationFn: (q: string) => askAssistant({ question: q }),
    onSuccess: (res: AskResult, q) => {
      setError(null)
      setMessages((prev) => [...prev, { role: 'user', content: q }, { role: 'assistant', content: res.reply }])
      setQuestion('')
      qc.invalidateQueries({ queryKey: ['assistant-quota'] })
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    },
    onError: (e: Error) => setError(e.message),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || askMutation.isPending) return
    askMutation.mutate(q)
  }

  if (!isLoggedIn) {
    return (
      <FeaturePageShell>
        <div className="mx-auto max-w-lg rounded-3xl border border-neutral-200/80 bg-white p-10 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <SparklesIcon className="mx-auto size-12 text-neutral-300 dark:text-neutral-600" aria-hidden />
          <h1 className="mt-4 text-xl font-bold">Asisten PSD</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Masuk untuk bertanya dan mendapat rekomendasi personal.
          </p>
          <ButtonPrimary href="/login?next=/assistant" className="mt-6">
            Masuk
          </ButtonPrimary>
        </div>
      </FeaturePageShell>
    )
  }

  return (
    <FeaturePageShell>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
              <SparklesIcon className="size-3.5" aria-hidden />
              AI Asisten
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Asisten PSD</h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Tanya cara pakai fitur platform — dijawab dalam Bahasa Indonesia, dengan kuota per tier.
            </p>
          </div>
          {quota.data && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Kuota hari ini ({quota.data.tier}):{' '}
              <strong className="text-neutral-800 dark:text-neutral-200">
                {quota.data.used}/{quota.data.limit}
              </strong>
            </p>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="flex min-h-[420px] flex-col rounded-3xl border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-800">
            <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
              {messages.length === 0 ? (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
                  <SparklesIcon className="size-10 text-sky-300 dark:text-sky-700" aria-hidden />
                  <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                    Tanyakan apa saja tentang PSD — dataset, course, kompetisi, notebook, dan lainnya.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setQuestion(s)}
                        className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-700 transition hover:border-sky-300 hover:bg-sky-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={`${m.role}-${i}`}
                    className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={clsx(
                        'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                        m.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'border border-neutral-200/80 bg-neutral-50 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200',
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSubmit} className="border-t border-neutral-200/80 p-4 dark:border-neutral-700">
              {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-2">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Tulis pertanyaan…"
                  rows={2}
                  className="min-h-0 flex-1 !rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                />
                <div className="flex flex-col gap-2">
                  <ButtonPrimary type="submit" disabled={askMutation.isPending || !question.trim()}>
                    <PaperAirplaneIcon className="size-4" aria-hidden />
                  </ButtonPrimary>
                  {messages.length > 0 && (
                    <Button type="button" outline onClick={() => setMessages([])} title="Hapus riwayat">
                      <TrashIcon className="size-4" aria-hidden />
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>

          <PersonalizedFeedSection compact />
        </div>
      </div>
    </FeaturePageShell>
  )
}
