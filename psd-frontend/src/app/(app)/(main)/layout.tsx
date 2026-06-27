import { ApplicationLayout } from '@/app/(app)/application-layout'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <ApplicationLayout headerHasBorder>{children}</ApplicationLayout>
}
