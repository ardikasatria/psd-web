import clsx from 'clsx'
import { ReactNode } from 'react'

interface FeaturePageShellProps {
  children: ReactNode
  className?: string
}

export function FeaturePageShell({ children, className }: FeaturePageShellProps) {
  return (
    <div className={clsx('relative pb-20 lg:pb-28', className)}>
      <div className="container space-y-14 pt-8 lg:space-y-20 lg:pt-12">{children}</div>
    </div>
  )
}
