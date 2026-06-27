import { StreakPageContent } from '@/components/features/micro/StreakPageContent'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Streak belajar' }

export default function Page() {
  return <StreakPageContent />
}
