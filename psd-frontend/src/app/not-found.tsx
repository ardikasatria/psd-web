import { ApplicationLayout } from '@/app/(app)/application-layout'
import Aside from '@/components/aside'
import { NotFoundPage } from '@/components/features/errors/NotFoundPage'

export default function NotFound() {
  return (
    <Aside.Provider>
      <ApplicationLayout headerHasBorder>
        <NotFoundPage />
      </ApplicationLayout>
    </Aside.Provider>
  )
}
