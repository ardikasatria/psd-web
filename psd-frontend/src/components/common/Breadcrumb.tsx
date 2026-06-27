import { ChevronRightIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

export type BreadcrumbItem = {
  label: string
  href?: string
}

export function Breadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[]
  className?: string
}) {
  if (!items.length) return null

  return (
    <nav aria-label="Breadcrumb" className={clsx(className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <ChevronRightIcon className="size-3.5 shrink-0 opacity-60" aria-hidden />}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="truncate font-medium transition hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={clsx('truncate', isLast && 'font-medium text-neutral-800 dark:text-neutral-200')}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
