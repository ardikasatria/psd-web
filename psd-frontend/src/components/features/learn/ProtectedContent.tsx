'use client'

import clsx from 'clsx'
import { ReactNode } from 'react'

/** Mild copy protection for lesson content (not DRM). */
export function ProtectedContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx('select-none', className)}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </div>
  )
}
