import { MyLearningPage } from '@/components/features/dashboard/MyLearningPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Belajar saya' }

export default function Page() {
  return <MyLearningPage />
}
