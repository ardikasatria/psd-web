import { RegisterForm } from '@/components/features/auth/RegisterForm'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = { title: 'Daftar' }

export default function Page() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
