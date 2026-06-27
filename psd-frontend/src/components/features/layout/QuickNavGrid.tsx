import clsx from 'clsx'
import Link from 'next/link'
import { ComponentType, SVGProps } from 'react'

export interface QuickNavItem {
  label: string
  description: string
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  gradient: string
}

interface QuickNavGridProps {
  items: QuickNavItem[]
  className?: string
}

export function QuickNavGrid({ items, className }: QuickNavGridProps) {
  return (
    <div className={clsx('grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6', className)}>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div
              className={clsx(
                'mb-4 flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm transition-transform duration-300 group-hover:scale-110',
                item.gradient
              )}
            >
              <Icon className="size-5" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.label}</p>
            <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{item.description}</p>
          </Link>
        )
      })}
    </div>
  )
}
