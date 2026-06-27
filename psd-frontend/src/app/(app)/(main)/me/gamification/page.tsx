import { GamificationPageContent } from '@/components/features/gamification/GamificationPageContent'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pencapaian saya' }

export default function Page() {
  return <GamificationPageContent />
}
