'use client'

import { useHub } from '@/lib/hub/useHub'
import { useAuth } from '@/lib/auth/useAuth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

const OPEN_PATH = '/notebooks/open'

type Props = {
  outline?: boolean
  plain?: boolean
  compact?: boolean
  className?: string
  showLoginHint?: boolean
}

export function OpenHubButton({ outline, plain, compact, className, showLoginHint }: Props) {
  const { enabled, isLoading, launchUrl } = useHub()
  const { isLoggedIn } = useAuth()

  if (isLoading) {
    return (
      <Button disabled className={className}>
        Memuat…
      </Button>
    )
  }

  if (!enabled) {
    return (
      <div className={className}>
        <ButtonPrimary disabled>Buka kernel server</ButtonPrimary>
        <p className="mt-2 text-xs text-neutral-500">
          Kernel server belum aktif — pastikan JupyterHub di-deploy dan{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">PSD_HUB_ENABLED=true</code>.
        </p>
      </div>
    )
  }

  const label = compact ? 'Kernel server' : 'Buka kernel server'
  const icon = <ArrowTopRightOnSquareIcon className="size-4" aria-hidden />

  if (!isLoggedIn) {
    return (
      <div className={className}>
        <ButtonPrimary href={`/login?next=${encodeURIComponent(OPEN_PATH)}`} outline={outline}>
          {icon}
          {label}
        </ButtonPrimary>
        {showLoginHint && (
          <p className="mt-2 text-xs text-neutral-500">Masuk dulu — kernel server memakai akun PSD (OAuth otomatis).</p>
        )}
      </div>
    )
  }

  if (plain) {
    return (
      <Link
        href={launchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx('inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400', className)}
      >
        {label}
        {icon}
      </Link>
    )
  }

  if (outline) {
    return (
      <Button href={launchUrl} target="_blank" rel="noopener noreferrer" outline className={className}>
        {icon}
        {label}
      </Button>
    )
  }

  return (
    <ButtonPrimary href={launchUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {icon}
      {label}
    </ButtonPrimary>
  )
}
