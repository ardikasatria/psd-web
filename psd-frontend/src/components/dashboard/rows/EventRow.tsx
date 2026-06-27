import { Badge } from '@/shared/Badge'
import { EventSummary } from '@/types/api'
import { CalendarIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

const typeLabel: Record<string, string> = {
  webinar: 'Webinar',
  hackathon: 'Hackathon',
  bootcamp: 'Bootcamp',
  meetup: 'Meetup',
  demo_day: 'Demo day',
}

export function EventRow({ event: e }: { event: EventSummary }) {
  const date = new Date(e.starts_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Link
      href={`/events/${e.slug}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/50"
    >
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-medium text-neutral-900 dark:text-neutral-100">{e.title}</h4>
        <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
          <CalendarIcon className="size-3.5" aria-hidden />
          {date}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge color="zinc">{typeLabel[e.type]}</Badge>
        <span className="text-xs font-medium text-primary-600">Lihat detail</span>
      </div>
    </Link>
  )
}
