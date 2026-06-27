import { InterestsPageContent } from '@/components/features/interests/InterestsPageContent'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Minat saya' }

export default function Page() {
  return <InterestsPageContent />
}
