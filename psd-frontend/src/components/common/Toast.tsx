'use client'

import clsx from 'clsx'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type ToastItem = {
  id: number
  message: string
  variant: 'default' | 'error'
}

type ToastContextValue = {
  toast: (message: string, variant?: ToastItem['variant']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, variant: ToastItem['variant'] = 'default') => {
    const id = Date.now()
    setItems((prev) => [...prev, { id, message, variant }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:end-6 sm:bottom-6"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={clsx(
              'pointer-events-auto max-w-sm rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1',
              item.variant === 'error'
                ? 'bg-red-600 text-white ring-red-700/30'
                : 'bg-neutral-900 text-white ring-neutral-700/40 dark:bg-neutral-100 dark:text-neutral-900',
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
