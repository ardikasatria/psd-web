import { CategoryBadge } from '@/components/common/CategoryBadge'
import { Badge } from '@/shared/Badge'
import { FeaturedBadge } from '@/components/common/FeaturedBadge'
import { EventSummary } from '@/types/api'
import { CalendarIcon, MapPinIcon, UsersIcon } from '@heroicons/react/24/outline'
import { trackEventClick } from '@/lib/analytics/entities'
import Image from 'next/image'
import Link from 'next/link'

const typeLabel: Record<string, string> = {
  webinar: 'Webinar',
  hackathon: 'Hackathon',
  bootcamp: 'Bootcamp',
  meetup: 'Meetup',
  demo_day: 'Demo day',
}

export function EventCard({ event }: { event: EventSummary }) {
  const date = new Date(event.starts_at)
  const day = date.toLocaleDateString('id-ID', { day: 'numeric' })
  const month = date.toLocaleDateString('id-ID', { month: 'short' })
  const fullDate = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Link
      href={`/events/${event.slug}`}
      onClick={() => trackEventClick(event)}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
    >
      <div className="relative aspect-[2/1] overflow-hidden">
        {event.cover_url ? (
          <Image src={event.cover_url} alt="" fill className="object-cover transition duration-300 group-hover:scale-105" unoptimized />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute start-4 top-4 flex flex-col items-center rounded-xl bg-white/95 px-3 py-2 text-center shadow dark:bg-neutral-900/95">
          <span className="text-xl font-bold leading-none text-primary-700 dark:text-primary-300">{day}</span>
          <span className="text-xs font-medium uppercase text-neutral-500">{month}</span>
        </div>
        <div className="absolute end-4 top-4 flex flex-wrap justify-end gap-1.5">
          <Badge color="zinc" className="!bg-black/40 !text-white ring-0">{typeLabel[event.type]}</Badge>
          {event.featured && <FeaturedBadge />}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge color={event.mode === 'daring' ? 'blue' : 'green'}>{event.mode === 'daring' ? 'Daring' : 'Luring'}</Badge>
        </div>
        <h3 className="line-clamp-2 text-lg font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-neutral-100">
          {event.title}
        </h3>
        <CategoryBadge category={event.category} subcategory={event.subcategory} className="mt-2" />
        <div className="mt-4 space-y-2 text-sm text-neutral-500">
          <p className="flex items-center gap-2">
            <CalendarIcon className="size-4 shrink-0" aria-hidden />
            {fullDate}
          </p>
          {event.location && (
            <p className="flex items-center gap-2">
              <MapPinIcon className="size-4 shrink-0" aria-hidden />
              <span className="line-clamp-1">{event.location}</span>
            </p>
          )}
          <p className="flex items-center gap-2">
            <UsersIcon className="size-4 shrink-0" aria-hidden />
            {event.registered}
            {event.capacity ? ` / ${event.capacity}` : ''} terdaftar
          </p>
        </div>
      </div>
    </Link>
  )
}
