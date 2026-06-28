'use client'

import { ReactNode } from 'react'
import clsx from 'clsx'
import {
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

type AuthEmailNoticeVariant = 'success' | 'info' | 'warning'

const VARIANTS: Record<
  AuthEmailNoticeVariant,
  { icon: typeof EnvelopeIcon; ring: string; bg: string; text: string; iconColor: string }
> = {
  success: {
    icon: CheckCircleIcon,
    ring: 'border-green-200 dark:border-green-800',
    bg: 'bg-green-50 dark:bg-green-950/30',
    text: 'text-green-900 dark:text-green-100',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  info: {
    icon: EnvelopeIcon,
    ring: 'border-primary-200 dark:border-primary-800',
    bg: 'bg-primary-50 dark:bg-primary-950/20',
    text: 'text-primary-900 dark:text-primary-100',
    iconColor: 'text-primary-600 dark:text-primary-400',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    ring: 'border-amber-200 dark:border-amber-800',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-900 dark:text-amber-100',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
}

export function AuthEmailNotice({
  variant = 'info',
  title,
  children,
  className,
}: {
  variant?: AuthEmailNoticeVariant
  title: string
  children: ReactNode
  className?: string
}) {
  const v = VARIANTS[variant]
  const Icon = v.icon
  return (
    <div
      className={clsx(
        'flex gap-4 rounded-2xl border p-5',
        v.ring,
        v.bg,
        className
      )}
    >
      <Icon className={clsx('mt-0.5 size-6 shrink-0', v.iconColor)} aria-hidden />
      <div className="min-w-0">
        <p className={clsx('font-semibold', v.text)}>{title}</p>
        <div className={clsx('mt-1.5 text-sm leading-relaxed', v.text, 'opacity-90')}>{children}</div>
      </div>
    </div>
  )
}

export function AuthEmailTips() {
  return (
    <ul className="mt-4 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
      <li className="flex gap-2">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-neutral-400" aria-hidden />
        Periksa folder spam atau promosi jika email belum muncul dalam beberapa menit.
      </li>
      <li className="flex gap-2">
        <EnvelopeIcon className="mt-0.5 size-4 shrink-0 text-neutral-400" aria-hidden />
        Email dikirim dari alamat resmi PSD dengan desain dan tombol aksi yang aman.
      </li>
    </ul>
  )
}
