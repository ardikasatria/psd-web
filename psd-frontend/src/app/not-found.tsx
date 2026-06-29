import { ApplicationLayout } from '@/app/(app)/application-layout'
import { NotFoundPage } from '@/components/features/errors/NotFoundPage'

export default function NotFound() {
  return (
    <ApplicationLayout headerHasBorder>
      <NotFoundPage />
    </ApplicationLayout>
  )
}
