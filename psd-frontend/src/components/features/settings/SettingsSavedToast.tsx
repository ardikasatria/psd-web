'use client'

import clsx from 'clsx'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

export function SettingsSavedToast({ show }: { show: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'pointer-events-none fixed bottom-6 end-6 z-50 flex items-center gap-2 rounded-2xl border border-primary-200 bg-white px-4 py-3 text-sm font-medium text-primary-800 shadow-lg motion-safe:transition-all motion-safe:duration-300 dark:border-primary-800 dark:bg-neutral-900 dark:text-primary-200',
        show ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <CheckCircleIcon className="size-5 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
      Tersimpan
    </div>
  )
}
