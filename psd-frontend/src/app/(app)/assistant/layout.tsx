import { ApplicationLayout } from '@/app/(app)/application-layout'

export default function AssistantLayout({ children }: { children: React.ReactNode }) {
  return (
    <ApplicationLayout headerHasBorder showFooter={false}>
      {children}
    </ApplicationLayout>
  )
}
