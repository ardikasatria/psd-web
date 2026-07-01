'use client'

import { verificationLabel } from '@/lib/orgs/org-utils'
import { OrgVerificationBadge } from '@/components/features/orgs/OrgVerificationBadge'
import { orgCard, orgTextMuted } from '@/lib/orgs/org-ui'
import Link from 'next/link'
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export function OrgStatusBanner({
  handle,
  verification,
  type,
}: {
  handle: string
  verification: string
  type: string
}) {
  if (verification === 'verified') return null

  const cfg: Record<
    string,
    { icon: typeof ClockIcon; className: string; message: string; cta?: { label: string; href: string } }
  > = {
    pending: {
      icon: ClockIcon,
      className:
        'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
      message: 'Verifikasi organisasi sedang ditinjau tim admin platform.',
    },
    rejected: {
      icon: XCircleIcon,
      className:
        'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200',
      message: 'Verifikasi ditolak. Perbarui dokumen dan ajukan ulang di pengaturan.',
      cta: { label: 'Ajukan ulang', href: `/orgs/${handle}?tab=settings` },
    },
    unverified: {
      icon: ExclamationTriangleIcon,
      className:
        'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
      message:
        type === 'umkm' || type === 'enterprise' || type === 'academic'
          ? 'Organisasi belum terverifikasi. Ajukan verifikasi untuk memasang peluang rekrutmen.'
          : 'Organisasi belum terverifikasi.',
      cta:
        type === 'umkm' || type === 'enterprise' || type === 'academic'
          ? { label: 'Mulai verifikasi', href: `/orgs/${handle}?tab=settings` }
          : undefined,
    },
  }

  const c = cfg[verification]
  if (!c) return null
  const Icon = c.icon

  return (
    <div className={`mb-6 flex flex-wrap items-start gap-3 rounded-2xl border p-4 ${c.className} ${orgCard}`}>
      <Icon className="size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{verificationLabel[verification]}</span>
          <OrgVerificationBadge status={verification} />
        </div>
        <p className={`text-sm ${orgTextMuted}`}>{c.message}</p>
        {c.cta && (
          <Link href={c.cta.href} className="mt-2 inline-block text-sm font-medium underline">
            {c.cta.label} →
          </Link>
        )}
      </div>
      {verification === 'verified' && <CheckCircleIcon className="size-5 text-emerald-600" aria-hidden />}
    </div>
  )
}
