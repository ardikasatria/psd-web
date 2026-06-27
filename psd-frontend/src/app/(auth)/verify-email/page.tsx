import { VerifyEmailContent } from '@/components/features/auth/VerifyEmailContent'
import { Suspense } from 'react'

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}
