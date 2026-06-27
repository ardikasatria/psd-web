import { MyCompetitionsPage } from '@/components/features/dashboard/MyCompetitionsPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Kompetisi saya' }

export default function Page() {
  return <MyCompetitionsPage />
}
