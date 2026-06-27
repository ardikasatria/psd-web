import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'

export function OfficialBadge({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
        className
      )}
      title="Akun resmi PSD"
    >
      <CheckBadgeIcon className="size-3.5 shrink-0" aria-hidden />
      Resmi
    </span>
  )
}
