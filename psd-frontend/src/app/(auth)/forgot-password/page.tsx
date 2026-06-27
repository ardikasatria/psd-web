import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Lupa kata sandi' }

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
