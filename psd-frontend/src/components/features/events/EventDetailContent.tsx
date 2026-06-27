'use client'

import { EventCoverHero, EventMediaCarousel } from '@/components/features/events/EventMedia'
import { QueryState } from '@/components/features/QueryState'
import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { useTrackView } from '@/lib/analytics/useTrackView'
import { cancelEvent, eventIcsUrl, getEvent, registerEvent } from '@/lib/api/events'
import { EventDetail } from '@/types/api'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import {
  CalendarDaysIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

const typeLabel: Record<EventDetail['type'], string> = {
  webinar: 'Webinar',
  hackathon: 'Hackathon',
  bootcamp: 'Bootcamp',
  meetup: 'Meetup',
  demo_day: 'Demo day',
}

function formatDateRange(starts: string, ends: string) {
  const s = new Date(starts)
  const e = new Date(ends)
  const dateOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  const sameDay = s.toDateString() === e.toDateString()
  if (sameDay) {
    return `${s.toLocaleDateString('id-ID', dateOpts)}, ${s.toLocaleTimeString('id-ID', timeOpts)} – ${e.toLocaleTimeString('id-ID', timeOpts)} WIB`
  }
  return `${s.toLocaleDateString('id-ID', dateOpts)} – ${e.toLocaleDateString('id-ID', dateOpts)}`
}

function CapacityInfo({ event }: { event: EventDetail }) {
  if (event.capacity == null) {
    return (
      <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        <UsersIcon className="size-4 shrink-0" />
        {event.registered} peserta terdaftar · Tanpa batas kuota
      </p>
    )
  }
  if (event.spots_left === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
        <UsersIcon className="size-4 shrink-0" />
        Kuota penuh ({event.registered}/{event.capacity}) — daftar tunggu tersedia
      </p>
    )
  }
  return (
    <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
      <UsersIcon className="size-4 shrink-0" />
      {event.registered}/{event.capacity} terdaftar ·{' '}
      <span className="font-medium text-emerald-600 dark:text-emerald-400">{event.spots_left} kursi tersisa</span>
    </p>
  )
}

export function EventDetailContent({ slug }: { slug: string }) {
  const qc = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['event', slug],
    queryFn: (): Promise<EventDetail> => getEvent(slug),
  })

  const event: EventDetail | undefined = data
  const isPast = event?.status === 'past'
  const reg = event?.my_registration

  useTrackView(!!event, 'event', event?.slug, {
    category_slug: event?.category?.slug,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['event', slug] })
    qc.invalidateQueries({ queryKey: ['dash', 'my-events'] })
    qc.invalidateQueries({ queryKey: ['events'] })
  }

  const register = useMutation({
    mutationFn: () => registerEvent(slug),
    onSuccess: invalidate,
  })

  const cancel = useMutation({
    mutationFn: () => cancelEvent(slug),
    onSuccess: invalidate,
  })

  return (
    <div className="container py-6 lg:py-10">
      <QueryState isLoading={isLoading} isError={isError} error={error}>
        {event && (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            {/* Main content */}
            <div>
              <Link
                href="/events"
                className="text-sm font-medium text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400"
              >
                ← Semua event
              </Link>

              <div className="mt-4">
                <EventCoverHero coverUrl={event.cover_url} title={event.title} />
                <EventMediaCarousel urls={event.gallery_urls ?? []} />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge color="zinc">{typeLabel[event.type]}</Badge>
                <Badge color="zinc">{event.mode === 'daring' ? 'Daring' : 'Luring'}</Badge>
                {isPast && <Badge color="zinc">Telah berakhir</Badge>}
              </div>

              <div className="mt-4 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <p className="flex items-center gap-2">
                  <CalendarDaysIcon className="size-4 shrink-0" />
                  {formatDateRange(event.starts_at, event.ends_at)}
                </p>
                {(event.location || event.mode === 'daring') && (
                  <p className="flex items-center gap-2">
                    <MapPinIcon className="size-4 shrink-0" />
                    {event.location ?? 'Online (daring)'}
                  </p>
                )}
              </div>

              <section className="mt-8">
                <h2 className="text-lg font-semibold">Tentang event</h2>
                <div className="mt-3">
                  <SimpleMarkdown content={event.description_md} className="text-base" />
                </div>
              </section>

              <section className="mt-10">
                <h2 className="text-lg font-semibold">Agenda</h2>
                <ul className="mt-4 space-y-0 divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
                  {event.agenda.map((item, i) => (
                    <li key={i} className="flex gap-4 px-4 py-3 text-sm">
                      <span className="flex w-14 shrink-0 items-center gap-1 font-medium tabular-nums text-primary-600 dark:text-primary-400">
                        <ClockIcon className="size-3.5" />
                        {item.time}
                      </span>
                      <span className="text-neutral-700 dark:text-neutral-300">{item.title}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-10">
                <h2 className="text-lg font-semibold">Pembicara</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {event.speakers.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-700 dark:bg-neutral-800/30"
                    >
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{s.name}</p>
                      <p className="mt-0.5 text-sm text-neutral-500">{s.title}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar — registration card */}
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                <CapacityInfo event={event} />

                <div className="mt-5 space-y-3">
                  {isPast ? (
                    <p className="rounded-lg bg-neutral-100 px-4 py-3 text-center text-sm text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
                      Event ini telah berakhir. Pendaftaran ditutup.
                    </p>
                  ) : !reg ? (
                    <>
                      <ButtonPrimary
                        className="w-full !gap-2"
                        onClick={() => register.mutate()}
                        disabled={register.isPending}
                      >
                        {register.isPending ? 'Mendaftar…' : 'Daftar event'}
                      </ButtonPrimary>
                      {register.isError && (
                        <p className="text-center text-xs text-red-600" role="alert">
                          Gagal mendaftar. Pastikan Anda sudah masuk.
                        </p>
                      )}
                    </>
                  ) : reg.status === 'registered' ? (
                    <>
                      <div className="rounded-lg bg-emerald-50 px-4 py-3 text-center dark:bg-emerald-950/30">
                        <Badge color="green">Terdaftar</Badge>
                        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                          Anda terdaftar untuk event ini. Sampai jumpa!
                        </p>
                      </div>
                      <Button
                        outline
                        className="w-full"
                        onClick={() => cancel.mutate()}
                        disabled={cancel.isPending}
                      >
                        {cancel.isPending ? 'Membatalkan…' : 'Batalkan pendaftaran'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg bg-amber-50 px-4 py-3 text-center dark:bg-amber-950/30">
                        <Badge color="yellow">Daftar tunggu</Badge>
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                          Anda dalam antrean. Kursi akan diberikan jika ada yang batal.
                        </p>
                      </div>
                      <Button
                        outline
                        className="w-full"
                        onClick={() => cancel.mutate()}
                        disabled={cancel.isPending}
                      >
                        {cancel.isPending ? 'Keluar…' : 'Keluar dari daftar tunggu'}
                      </Button>
                    </>
                  )}

                  <a
                    href={eventIcsUrl(slug)}
                    download={`${slug}.ics`}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  >
                    <CalendarIcon className="size-4" />
                    Tambah ke kalender
                  </a>
                </div>
              </div>
            </aside>
          </div>
        )}
      </QueryState>
    </div>
  )
}
