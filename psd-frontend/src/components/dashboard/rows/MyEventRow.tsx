'use client'

import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { cancelEvent } from '@/lib/api/events'
import { MyEventRegistration } from '@/types/api'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const statusLabel: Record<MyEventRegistration['status'], string> = {
  registered: 'Terdaftar',
  waitlisted: 'Daftar tunggu',
}

const statusColor: Record<MyEventRegistration['status'], 'green' | 'yellow'> = {
  registered: 'green',
  waitlisted: 'yellow',
}

const modeLabel: Record<MyEventRegistration['event']['mode'], string> = {
  daring: 'Daring',
  luring: 'Luring',
}

export function MyEventRow({ registration: r }: { registration: MyEventRegistration }) {
  const qc = useQueryClient()
  const date = new Date(r.event.starts_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const cancel = useMutation({
    mutationFn: () => cancelEvent(r.event.slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dash', 'my-events'] })
      qc.invalidateQueries({ queryKey: ['event', r.event.slug] })
    },
  })

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-4 dark:border-neutral-700">
      <Link href={`/events/${r.event.slug}`} className="min-w-0 flex-1 hover:opacity-90">
        <h4 className="truncate font-medium text-neutral-900 dark:text-neutral-100">{r.event.title}</h4>
        <p className="mt-1 text-xs text-neutral-500">
          {modeLabel[r.event.mode]} · {date}
        </p>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <Badge color={statusColor[r.status]}>{statusLabel[r.status]}</Badge>
        <Button
          outline
          className="!px-2.5 !py-1.5 !text-xs"
          onClick={() => cancel.mutate()}
          disabled={cancel.isPending}
        >
          {cancel.isPending ? '…' : 'Batal'}
        </Button>
      </div>
    </div>
  )
}
