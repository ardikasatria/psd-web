'use client'

import { useAuth } from '@/lib/auth/useAuth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { PlayIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

const WORKSPACE_PATH = '/notebooks/workspace'

type Props = {
  notebookId?: string
  outline?: boolean
  compact?: boolean
  plain?: boolean
  viewOnly?: boolean
  className?: string
}

/** CTA utama — editor notebook terintegrasi di dalam PSD (bukan buka tab Hub). */
export function OpenNotebookButton({ notebookId, outline, compact, plain, viewOnly, className }: Props) {
  const { isLoggedIn } = useAuth()
  const label = compact
    ? viewOnly
      ? 'Preview'
      : 'Mulai'
    : viewOnly
      ? 'Preview notebook'
      : 'Mulai notebook'
  const target = notebookId
    ? viewOnly
      ? `/notebooks/${notebookId}/preview`
      : `/notebooks/${notebookId}/workspace`
    : WORKSPACE_PATH
  const href = isLoggedIn ? target : `/login?next=${encodeURIComponent(target)}`

  if (plain) {
    return (
      <Link
        href={href}
        className={clsx(
          'inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:underline dark:text-violet-300',
          className,
        )}
      >
        {label}
        <PlayIcon className="size-3.5" aria-hidden />
      </Link>
    )
  }

  return (
    <ButtonPrimary href={href} outline={outline} className={clsx(className)}>
      <PlayIcon className="size-4" aria-hidden />
      {label}
    </ButtonPrimary>
  )
}
