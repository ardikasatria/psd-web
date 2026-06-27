'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'psd_cookie_notice_dismissed'

export function CookieNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Pemberitahuan cookie"
      className="fixed inset-x-4 bottom-4 z-40 max-w-xl rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 sm:inset-x-auto sm:start-6"
    >
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        PSD menggunakan cookie sesi autentikasi (httpOnly) agar Anda tetap masuk dengan aman. Dengan
        melanjutkan, Anda memahami penggunaan cookie ini. Lihat{' '}
        <Link href="/legal/kebijakan-privasi" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          Kebijakan Privasi
        </Link>
        .
      </p>
      <button
        type="button"
        className="mt-3 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
        onClick={() => {
          try {
            localStorage.setItem(STORAGE_KEY, '1')
          } catch {
            /* ignore */
          }
          setVisible(false)
        }}
      >
        Mengerti
      </button>
    </div>
  )
}
