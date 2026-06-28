'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export default function EmailUnsubscribePage() {
  const params = useSearchParams()
  const token = params.get('token')
  const [body, setBody] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!token) {
      setFailed(true)
      return
    }
    fetch(`${API}/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const text = await res.text()
        if (!res.ok) {
          setFailed(true)
        }
        setBody(text)
      })
      .catch(() => setFailed(true))
  }, [token])

  if (failed && !body) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Link tidak valid</h1>
        <p className="mt-2 text-zinc-600">Token berhenti berlangganan tidak ditemukan atau sudah kedaluwarsa.</p>
      </main>
    )
  }

  if (!body) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-zinc-600">Memproses permintaan berhenti berlangganan…</p>
      </main>
    )
  }

  return <main className="prose mx-auto max-w-lg px-4 py-16 dark:prose-invert" dangerouslySetInnerHTML={{ __html: body }} />
}
