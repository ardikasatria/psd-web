'use client'

import { useNotebookKernelAccess } from '@/lib/notebooks/useNotebookKernelAccess'
import { useAuth } from '@/lib/auth/useAuth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { CodeBracketSquareIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

type Props = {
  outline?: boolean
  plain?: boolean
  compact?: boolean
  className?: string
  showLoginHint?: boolean
}

/** @deprecated Gunakan workspace + toggle Server di editor. Tetap ada untuk kompatibilitas link lama. */
export function OpenHubButton({ outline, plain, compact, className, showLoginHint }: Props) {
  const { canServer, pendingGrant, isLoading } = useNotebookKernelAccess()
  const { isLoggedIn } = useAuth()

  if (isLoading) {
    return (
      <Button disabled className={className}>
        Memuat…
      </Button>
    )
  }

  const label = compact ? 'Kernel server' : 'Buka workspace notebook'
  const icon = <CodeBracketSquareIcon className="size-4" aria-hidden />
  const href = '/notebooks/workspace'

  if (!isLoggedIn) {
    return (
      <div className={className}>
        <ButtonPrimary href={`/login?next=${encodeURIComponent(href)}`} outline={outline}>
          {icon}
          {label}
        </ButtonPrimary>
        {showLoginHint && (
          <p className="mt-2 text-xs text-neutral-500">Masuk dulu untuk membuka editor notebook.</p>
        )}
      </div>
    )
  }

  if (!canServer && !pendingGrant) {
    return (
      <div className={className}>
        <ButtonPrimary href="/notebooks/kernel-request" outline>
          Ajukan kernel server
        </ButtonPrimary>
      </div>
    )
  }

  if (plain) {
    return (
      <a
        href={href}
        className={clsx(
          'inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400',
          className,
        )}
      >
        {label}
        {icon}
      </a>
    )
  }

  if (outline) {
    return (
      <Button href={href} outline className={className}>
        {icon}
        {label}
      </Button>
    )
  }

  return (
    <ButtonPrimary href={href} className={className}>
      {icon}
      {label}
    </ButtonPrimary>
  )
}
