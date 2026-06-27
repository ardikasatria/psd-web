'use client'

import Link from 'next/link'
import clsx from 'clsx'
import type { CategoryRef } from '@/types/api'

type Props = {
  category?: CategoryRef | null
  subcategory?: CategoryRef | null
  className?: string
  size?: 'sm' | 'md'
}

export function CategoryBadge({ category, subcategory, className, size = 'sm' }: Props) {
  if (!category) return null

  const pad = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  const href = subcategory
    ? `/categories/${category.slug}?subcategory=${subcategory.slug}`
    : `/categories/${category.slug}`

  return (
    <div className={clsx('pointer-events-auto relative z-10 flex flex-wrap items-center gap-1.5', className)}>
      <Link
        href={href}
        className={clsx(
          'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
          pad,
          'border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100',
          'dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-300 dark:hover:bg-primary-900/40',
        )}
      >
        <span className="text-primary-500 dark:text-primary-400">#</span>
        {subcategory ? (
          <>
            <span className="text-primary-400 dark:text-primary-500">{category.name}</span>
            <span className="text-primary-300 dark:text-primary-600">/</span>
            <span>{subcategory.name}</span>
          </>
        ) : (
          <span>{category.name}</span>
        )}
      </Link>
    </div>
  )
}
