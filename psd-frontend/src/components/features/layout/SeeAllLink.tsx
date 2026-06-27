import { ArrowRightIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

interface SeeAllLinkProps {
  href: string
  label?: string
  className?: string
}

export function SeeAllLink({ href, label = 'Lihat semua', className }: SeeAllLinkProps) {
  return (
    <Link
      href={href}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-100 sm:text-base dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-300 dark:hover:bg-primary-900/50',
        className
      )}
    >
      {label}
      <ArrowRightIcon className="size-4 shrink-0" aria-hidden />
    </Link>
  )
}
