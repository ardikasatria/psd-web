import { LearnPage } from '@/components/features/learn/LearnPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Belajar' }

export default function Page() {
  return (
    <LearnPage />
  )
}
