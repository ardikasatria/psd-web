import { ExploreHubPage } from '@/components/features/explore/ExploreHubPage'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Explore',
  description: 'Jelajahi proyek, dataset, dan model sains data dari komunitas Projek Sains Data.',
}

export default function Page() {
  return <ExploreHubPage />
}
