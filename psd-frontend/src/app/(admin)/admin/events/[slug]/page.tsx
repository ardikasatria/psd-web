'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, AdminTableEmpty } from '@/components/admin/AdminShared'
import { checkInRegistration, getEventRegistrations } from '@/lib/api/admin'
import { getEvents } from '@/lib/api/events'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Switch } from '@/shared/switch'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { EventRegistrationAdmin, EventSummary } from '@/types/api'
import { ArrowDownTrayIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { use } from 'react'

const statusLabel: Record<string, string> = {
  registered: 'Terdaftar',
  waitlisted: 'Daftar tunggu',
}

export default function AdminEventParticipantsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const qc = useQueryClient()

  const eventList = useQuery({ queryKey: ['admin', 'events'], queryFn: () => getEvents({ page_size: 50 }) })
  const event = eventList.data?.items.find((e: EventSummary) => e.slug === slug)

  const list = useQuery({
    queryKey: ['admin', 'event-registrations', slug],
    queryFn: () => getEventRegistrations(slug),
  })

  const checkIn = useMutation({
    mutationFn: ({ id, attended }: { id: string; attended: boolean }) =>
      checkInRegistration(slug, id, attended),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'event-registrations', slug] }),
  })

  const items: EventRegistrationAdmin[] = list.data?.items ?? []
  const registered = items.filter((i) => i.status === 'registered').length
  const waitlisted = items.filter((i) => i.status === 'waitlisted').length
  const attended = items.filter((i) => i.attended).length

  const exportCsv = () => {
    const header = 'nama,username,status,hadir\n'
    const rows = items
      .map(
        (r) =>
          `"${r.user.name}","${r.user.username}","${r.status}","${r.attended ? 'ya' : 'tidak'}"`,
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}-peserta.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <AdminPageHeader
        title={event?.title ?? slug}
        description="Daftar peserta, check-in kehadiran, dan ekspor data."
        actions={
          <div className="flex gap-2">
            <Button outline onClick={exportCsv} disabled={!items.length}>
              <ArrowDownTrayIcon className="size-4" data-slot="icon" />
              Ekspor CSV
            </Button>
            <Button href="/admin/events" outline>
              <ArrowLeftIcon className="size-4" data-slot="icon" />
              Kembali
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-sm text-neutral-500">Terdaftar</p>
          <p className="mt-1 text-2xl font-semibold">{registered}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-sm text-neutral-500">Daftar tunggu</p>
          <p className="mt-1 text-2xl font-semibold">{waitlisted}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-sm text-neutral-500">Hadir (check-in)</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{attended}</p>
        </div>
      </div>

      {list.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader>Nama</TableHeader>
                <TableHeader>Username</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Hadir</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((r: EventRegistrationAdmin) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.user.name}</TableCell>
                  <TableCell>
                    <Link
                      href={`/${r.user.username}`}
                      className="text-primary-600 hover:underline dark:text-primary-400"
                    >
                      @{r.user.username}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge color={r.status === 'registered' ? 'green' : 'yellow'}>
                      {statusLabel[r.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={r.attended}
                      onChange={(v) => checkIn.mutate({ id: r.id, attended: v })}
                      color="green"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {!items.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-neutral-500">
                    Belum ada pendaftaran.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </AdminTable>
        </AdminContentCard>
      )}
    </div>
  )
}
