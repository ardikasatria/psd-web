import { HomeContent } from '@/components/features/home/HomeContent'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Beranda',
}

export default function Page() {
  return (
    <HomeContent />
  )
}
