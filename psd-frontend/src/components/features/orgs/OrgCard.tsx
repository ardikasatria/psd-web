import { orgTypeLabel } from '@/lib/orgs/org-utils'
import { orgRoleLabel } from '@/lib/orgs/permissions'
import { MyOrg } from '@/types/api'
import { BuildingOffice2Icon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { OrgVerificationBadge } from './OrgVerificationBadge'
import { Badge } from '@/shared/Badge'

const CARD_ACCENTS = [
  'from-emerald-400 to-teal-600',
  'from-sky-400 to-indigo-600',
  'from-violet-400 to-purple-600',
  'from-amber-400 to-orange-500',
] as const

type OrgCardItem = Pick<MyOrg, 'id' | 'handle' | 'name' | 'type' | 'verification'> & {
  role?: MyOrg['role']
  description?: string
}

export function OrgCard({ org, index = 0 }: { org: OrgCardItem; index?: number }) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
  return (
    <Link
      href={`/orgs/${org.handle}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800"
    >
      <div className={clsx('relative h-20 bg-gradient-to-br px-5 py-4', accent)}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -end-6 -top-6 size-24 rounded-full bg-white/30 blur-xl" />
        </div>
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
            <BuildingOffice2Icon className="size-6" aria-hidden />
          </div>
          <OrgVerificationBadge status={org.verification} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-neutral-100 dark:group-hover:text-primary-400">
            {org.name}
          </h3>
          <p className="text-sm text-neutral-500">@{org.handle}</p>
          {org.description && (
            <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{org.description}</p>
          )}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Badge color="sky">{orgTypeLabel[org.type]}</Badge>
          {org.role && <Badge color="zinc">{orgRoleLabel[org.role] ?? org.role}</Badge>}
        </div>
      </div>
    </Link>
  )
}
