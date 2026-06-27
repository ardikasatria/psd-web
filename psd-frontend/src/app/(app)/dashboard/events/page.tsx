import { MyEventsPage } from '@/components/features/dashboard/MyEventsPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Event saya' }

export default function Page() {
  return <MyEventsPage />
}
