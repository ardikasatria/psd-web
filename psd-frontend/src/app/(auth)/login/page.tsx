import { LoginForm } from '@/components/features/auth/LoginForm'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = { title: 'Masuk' }

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
