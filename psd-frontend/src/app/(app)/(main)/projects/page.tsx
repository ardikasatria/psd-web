import { ProjectsPage } from '@/components/features/projects/ProjectsPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Proyek' }

export default function Page() {
  return <ProjectsPage />
}
