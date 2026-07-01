import { ExploreHubPage } from '@/components/features/explore/ExploreHubPage'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Explore',
  description: 'Jelajahi proyek, dataset, model, notebook, ruang kerja, dan komunitas sains data Indonesia.',
}

export default function Page() {
  return <ExploreHubPage />
}
