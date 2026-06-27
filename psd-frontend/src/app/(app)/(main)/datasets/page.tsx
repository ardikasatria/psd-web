import { DatasetsPage } from '@/components/features/datasets/DatasetsPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dataset' }

export default function Page() {
  return <DatasetsPage />
}
