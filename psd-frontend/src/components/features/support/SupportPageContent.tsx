'use client'

import { FeaturePageShell } from '@/components/features/layout'
import { QueryState } from '@/components/features/QueryState'
import { createTicket, myTickets, TICKET_CATEGORIES, TICKET_PRIORITIES } from '@/lib/api/support'
import { TICKET_STATUS_LABELS } from '@/lib/api/reports'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import type { Ticket } from '@/types/api'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { FormEvent, useState } from 'react'

const statusColor: Record<string, 'green' | 'yellow' | 'blue' | 'zinc'> = {
  open: 'yellow',
  in_progress: 'blue',
  resolved: 'green',
  closed: 'zinc',
}

export function SupportPageContent() {
  useAuthGuard('/login?next=/support')
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('bug')
  const [priority, setPriority] = useState('sedang')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const tickets = useQuery({
    queryKey: ['my-tickets'],
    queryFn: myTickets,
  })

  const submit = useMutation({
    mutationFn: () => createTicket({ category, priority, subject: subject.trim(), body: body.trim() }),
    onSuccess: () => {
      setShowForm(false)
      setSubject('')
      setBody('')
      qc.invalidateQueries({ queryKey: ['my-tickets'] })
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) return
    submit.mutate()
  }

  return (
    <FeaturePageShell className="!pt-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Bantuan & Pengaduan</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Laporkan masalah platform, bug, atau keluhan akun. Tim kami akan menindaklanjuti melalui tiket.
            </p>
          </div>
          <ButtonPrimary type="button" onClick={() => setShowForm((v) => !v)}>
            <PlusIcon className="size-4" />
            Buat pengaduan
          </ButtonPrimary>
        </div>

        {showForm && (
          <form
            onSubmit={onSubmit}
            className="mt-6 space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/50"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">Kategori</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                >
                  {TICKET_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">Prioritas</span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                >
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">Subjek</span>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 !rounded-xl" />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">Deskripsi</span>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="mt-1 !rounded-xl"
                placeholder="Jelaskan masalah secara rinci..."
              />
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? 'Mengirim...' : 'Kirim pengaduan'}
              </Button>
              <Button plain type="button" onClick={() => setShowForm(false)}>Batal</Button>
            </div>
          </form>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Tiket saya</h2>
          <QueryState isLoading={tickets.isLoading} isError={tickets.isError} error={tickets.error}>
            <div className="mt-4 space-y-3">
              {(tickets.data ?? []).length === 0 ? (
                <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
                  Belum ada tiket. Buat pengaduan jika Anda mengalami kendala.
                </p>
              ) : (
                (tickets.data ?? []).map((t: Ticket) => (
                  <Link
                    key={t.id}
                    href={`/support/${t.id}`}
                    className={clsx(
                      'block rounded-2xl border border-neutral-200/80 bg-white p-4 transition-colors',
                      'hover:border-primary-300 hover:bg-primary-50/30 dark:border-neutral-700 dark:bg-neutral-900/50',
                      'dark:hover:border-primary-700 dark:hover:bg-primary-950/20',
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">{t.subject}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {t.category} · {new Date(t.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <Badge color={statusColor[t.status] ?? 'zinc'}>
                        {TICKET_STATUS_LABELS[t.status] ?? t.status}
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </QueryState>
        </section>
      </div>
    </FeaturePageShell>
  )
}
