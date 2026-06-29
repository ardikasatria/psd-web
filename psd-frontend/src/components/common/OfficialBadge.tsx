import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'

export function OfficialBadge({ className }: { className?: string }) {
  return (
    <span className="inline-flex shrink-0" title="Akun resmi PSD">
      <CheckBadgeIcon
        className={clsx('size-3.5 text-primary-600 dark:text-primary-400', className)}
        aria-label="Akun resmi PSD"
      />
    </span>
  )
}
