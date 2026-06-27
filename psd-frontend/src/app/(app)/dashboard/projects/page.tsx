import { MyReposPage } from '@/components/features/dashboard/MyReposPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Proyek saya' }

export default function Page() {
  return <MyReposPage kind="project" />
}
