import { MyReposPage } from '@/components/features/dashboard/MyReposPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Model saya' }

export default function Page() {
  return <MyReposPage kind="model" />
}
