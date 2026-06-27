import clsx from 'clsx'
import Link from 'next/link'
import { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  href,
  icon,
}: {
  label: string
  value: ReactNode
  href?: string
  icon?: ReactNode
}) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</p>
        {icon && <span className="text-primary-600 dark:text-primary-400">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
    </>
  )

  const className = clsx(
    'rounded-2xl border border-neutral-200 bg-white p-6 transition-shadow dark:border-neutral-700 dark:bg-neutral-800',
    href && 'hover:shadow-md'
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}
