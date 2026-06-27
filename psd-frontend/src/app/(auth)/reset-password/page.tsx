import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = { title: 'Reset kata sandi' }

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
