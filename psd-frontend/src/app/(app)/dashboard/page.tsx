import { DashboardPageContent } from '@/components/features/dashboard/DashboardPageContent'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default function Page() {
  return <DashboardPageContent />
}
