import { EmailUnsubscribeContent } from '@/components/features/email/EmailUnsubscribeContent'
import { Suspense } from 'react'

export default function EmailUnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-4 py-16">
          <p className="text-neutral-600">Memuat…</p>
        </main>
      }
    >
      <EmailUnsubscribeContent />
    </Suspense>
  )
}
