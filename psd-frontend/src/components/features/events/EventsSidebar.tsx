'use client'

import { sidebarGradientBr } from '@/components/common/featureGradients'
import { getEventStats } from '@/lib/api/events'
import { getMyEvents } from '@/lib/api/me'
import { useAuth } from '@/lib/auth/useAuth'
import type { EventStats } from '@/types/api'
import {
  CalendarDaysIcon,
  ChartBarIcon,
  ClockIcon,
  SparklesIcon,
  TicketIcon,
  TrophyIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

const typeLabel: Record<string, string> = {
  webinar: 'Webinar',
  hackathon: 'Hackathon',
  bootcamp: 'Bootcamp',
  meetup: 'Meetup',
  demo_day: 'Demo day',
}

type Props = {
  activeType?: string | null
  onTypeClick?: (type: string | null) => void
  className?: string
}

function StatTile({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-800/60">
      <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">{icon}</div>
      <p className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  )
}

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function EventsSidebar({ activeType, onTypeClick, className }: Props) {
  const { isLoggedIn } = useAuth()
  const stats = useQuery<EventStats>({
    queryKey: ['event-stats'],
    queryFn: getEventStats,
    staleTime: 60_000,
  })
  const myEvents = useQuery({
    queryKey: ['my-events', 'sidebar'],
    queryFn: () => getMyEvents({ page_size: 4 }),
    enabled: isLoggedIn,
    staleTime: 60_000,
  })

  const data = stats.data

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Total event"
          value={stats.isLoading ? '—' : (data?.total_events ?? 0)}
          icon={<CalendarDaysIcon className="size-4" />}
        />
        <StatTile
          label="Akan datang"
          value={stats.isLoading ? '—' : (data?.upcoming ?? 0)}
          icon={<ClockIcon className="size-4" />}
        />
        <StatTile
          label="Peserta"
          value={stats.isLoading ? '—' : (data?.total_registered ?? 0)}
          icon={<UsersIcon className="size-4" />}
        />
      </div>

      {isLoggedIn && (data?.my_upcoming ?? 0) > 0 && (
        <div className={sidebarGradientBr.event}>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300">
            <TicketIcon className="size-4" aria-hidden />
            Pendaftaran Anda
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">{data!.my_upcoming}</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">event akan datang yang Anda ikuti</p>
        </div>
      )}

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <ChartBarIcon className="size-4 text-primary-500" />
          Jenis event
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {(data?.by_type ?? []).length === 0 && (
            <p className="text-xs text-neutral-500">Belum ada data jenis event.</p>
          )}
          {(data?.by_type ?? []).map(({ type, count }) => {
            const active = activeType === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => onTypeClick?.(active ? null : type)}
                className={clsx(
                  'rounded-full px-2.5 py-1 text-xs font-medium motion-safe:transition-colors',
                  active
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600',
                )}
              >
                {typeLabel[type] ?? type} ({count})
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <SparklesIcon className="size-4 text-amber-500" />
          Sorotan
        </h3>
        <ul className="mt-3 space-y-3">
          {(data?.featured ?? []).length === 0 && (
            <p className="text-xs text-neutral-500">Belum ada event sorotan.</p>
          )}
          {(data?.featured ?? []).map((e) => (
            <li key={e.slug}>
              <Link
                href={`/events/${e.slug}`}
                className="block rounded-xl border border-neutral-100 p-2.5 transition-colors hover:border-primary-200 hover:bg-primary-50/50 dark:border-neutral-700 dark:hover:border-primary-800 dark:hover:bg-primary-950/20"
              >
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{e.title}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {typeLabel[e.type] ?? e.type} · {formatEventDate(e.starts_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <TrophyIcon className="size-4 text-orange-500" />
          Segera dimulai
        </h3>
        <ul className="mt-3 space-y-3">
          {(data?.next_events ?? []).map((e) => (
            <li key={e.slug}>
              <Link
                href={`/events/${e.slug}`}
                className="flex items-start gap-3 rounded-xl p-1.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
              >
                <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  <span className="text-sm font-bold leading-none">
                    {new Date(e.starts_at).toLocaleDateString('id-ID', { day: 'numeric' })}
                  </span>
                  <span className="text-[10px] uppercase">
                    {new Date(e.starts_at).toLocaleDateString('id-ID', { month: 'short' })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">{e.title}</p>
                  <p className="text-xs text-neutral-500">
                    {e.registered}
                    {e.capacity != null ? `/${e.capacity}` : ''} peserta
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {isLoggedIn && (myEvents.data?.items.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Event saya</h3>
          <ul className="mt-3 space-y-2">
            {myEvents.data!.items.map((reg) => (
              <li key={reg.registration_id}>
                <Link
                  href={`/events/${reg.event.slug}`}
                  className="block text-sm text-primary-600 hover:underline dark:text-primary-400"
                >
                  {reg.event.title}
                </Link>
                <p className="text-xs text-neutral-500">{formatEventDate(reg.event.starts_at)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-800/60">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Ingin berkompetisi?</p>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Ikuti kompetisi sains data dengan konteks lokal Indonesia.
        </p>
        <Link href="/competitions" className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
          Lihat kompetisi →
        </Link>
      </section>
    </aside>
  )
}
