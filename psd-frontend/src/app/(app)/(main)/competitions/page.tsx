import { CompetitionsPage } from '@/components/features/competitions/CompetitionsPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Kompetisi' }

export default function Page() {
  return (
    <CompetitionsPage />
  )
}
