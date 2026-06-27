import { LeaderboardPageContent } from '@/components/features/gamification/LeaderboardPageContent'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Papan peringkat kontributor' }

export default function Page() {
  return <LeaderboardPageContent />
}
