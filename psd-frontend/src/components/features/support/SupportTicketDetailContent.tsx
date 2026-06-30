'use client'

import { FeaturePageShell } from '@/components/features/layout'
import { QueryState } from '@/components/features/QueryState'
import { getTicket, replyTicket } from '@/lib/api/support'
import { TICKET_STATUS_LABELS } from '@/lib/api/reports'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import type { TicketDetail } from '@/types/api'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Textarea from '@/shared/Textarea'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { FormEvent, useState } from 'react'

const statusColor: Record<string, 'green' | 'yellow' | 'blue' | 'zinc'> = {
  open: 'yellow',
  in_progress: 'blue',
  resolved: 'green',
  closed: 'zinc',
}

export function SupportTicketDetailContent({ id }: { id: string }) {
  useAuthGuard(`/login?next=/support/${id}`)
  const qc = useQueryClient()
  const [reply, setReply] = useState('')

  const { data, isLoading, isError, error } = useQuery<TicketDetail>({
    queryKey: ['ticket', id],
    queryFn: () => getTicket(id),
  })

  const send = useMutation({
    mutationFn: () => replyTicket(id, reply.trim()),
    onSuccess: () => {
      setReply('')
      qc.invalidateQueries({ queryKey: ['ticket', id] })
    },
  })

  return (
    <FeaturePageShell className="!pt-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/support"
          className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400"
        >
          <ChevronLeftIcon className="size-4" />
          Kembali ke tiket
        </Link>

        <QueryState isLoading={isLoading} isError={isError} error={error}>
          {data && (
            <article className="space-y-6">
              <header className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{data.subject}</h1>
                  <Badge color={statusColor[data.status] ?? 'zinc'}>
                    {TICKET_STATUS_LABELS[data.status] ?? data.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-neutral-600 whitespace-pre-wrap dark:text-neutral-400">{data.body}</p>
                <p className="mt-3 text-xs text-neutral-500">
                  {data.category} · prioritas {data.priority} · {new Date(data.created_at).toLocaleString('id-ID')}
                </p>
              </header>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Percakapan</h2>
                {data.messages.length === 0 ? (
                  <p className="text-sm text-neutral-500">Belum ada balasan.</p>
                ) : (
                  data.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        m.is_staff
                          ? 'border-primary-200 bg-primary-50/80 dark:border-primary-800 dark:bg-primary-950/30'
                          : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50'
                      }`}
                    >
                      <p className="text-xs font-medium text-neutral-500">
                        @{m.author.username}
                        {m.is_staff ? ' · Tim PSD' : ''} · {new Date(m.created_at).toLocaleString('id-ID')}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">{m.body}</p>
                    </div>
                  ))
                )}
              </section>

              {data.status !== 'closed' && (
                <form
                  className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/50"
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    if (!reply.trim()) return
                    send.mutate()
                  }}
                >
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={3}
                    placeholder="Tulis balasan..."
                    className="!rounded-xl text-sm"
                  />
                  <ButtonPrimary type="submit" className="mt-3" disabled={send.isPending}>
                    {send.isPending ? 'Mengirim...' : 'Kirim balasan'}
                  </ButtonPrimary>
                </form>
              )}
            </article>
          )}
        </QueryState>
      </div>
    </FeaturePageShell>
  )
}
