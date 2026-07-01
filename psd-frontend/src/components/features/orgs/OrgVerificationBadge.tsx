'use client'

import { verificationLabel } from '@/lib/orgs/org-utils'
import { Badge } from '@/shared/Badge'
import { CheckBadgeIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline'

const COLORS: Record<string, 'emerald' | 'amber' | 'zinc' | 'red'> = {
  verified: 'emerald',
  pending: 'amber',
  unverified: 'zinc',
  rejected: 'red',
}

export function OrgVerificationBadge({ status }: { status: string }) {
  const color = COLORS[status] ?? 'zinc'
  const Icon =
    status === 'verified' ? CheckBadgeIcon : status === 'pending' ? ClockIcon : status === 'rejected' ? XCircleIcon : null
  return (
    <Badge color={color} className="inline-flex items-center gap-1">
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {verificationLabel[status] ?? status}
    </Badge>
  )
}
