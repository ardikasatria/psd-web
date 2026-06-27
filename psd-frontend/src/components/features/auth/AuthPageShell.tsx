import { ReactNode } from 'react'
import clsx from 'clsx'

export const PSD_AUTH_GRADIENT =
  'linear-gradient(135deg, #4572b7 0%, color-mix(in srgb, #4572b7 45%, #f09394) 100%)'

export function AuthPageShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
      <div
        className={clsx(
          'w-full max-w-md rounded-2xl border border-white/30 bg-white p-8 shadow-2xl shadow-black/10 sm:p-10',
          'dark:border-neutral-700 dark:bg-neutral-900',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
