import { EventsPage } from '@/components/features/events/EventsPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Event' }

export default function Page() {
  return (
    <EventsPage />
  )
}
