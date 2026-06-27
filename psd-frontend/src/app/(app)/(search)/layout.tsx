import { ApplicationLayout } from '@/app/(app)/application-layout'
import { ReactNode } from 'react'

export default function SearchLayout({ children }: { children: ReactNode }) {
  return <ApplicationLayout headerHasBorder>{children}</ApplicationLayout>
}
