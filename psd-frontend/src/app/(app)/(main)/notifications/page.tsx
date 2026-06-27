import { NotificationsPageContent } from '@/components/features/notifications/NotificationsPageContent'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Notifikasi' }

export default function Page() {
  return <NotificationsPageContent />
}
