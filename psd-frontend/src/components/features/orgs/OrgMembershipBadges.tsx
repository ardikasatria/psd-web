'use client'

import { MY_ORGS_QUERY_KEY } from '@/components/features/orgs/MyOrgsPage'
import { myOrgs } from '@/lib/api/orgs'
import { orgRoleLabel } from '@/lib/orgs/permissions'
import { MyOrg } from '@/types/api'
import { Badge } from '@/shared/Badge'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

/** Badge organisasi yang diikuti — untuk profil akun. */
export function OrgMembershipBadges({ enabled = true }: { enabled?: boolean }) {
  const { data } = useQuery({
    queryKey: MY_ORGS_QUERY_KEY,
    queryFn: async () => {
      const res = await myOrgs()
      return res.items
    },
    enabled,
  })

  if (!data?.length) return null

  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Organisasi</p>
      <div className="flex flex-wrap gap-2">
        {data.map((org: MyOrg) => (
          <Link
            key={org.id}
            href={`/orgs/${org.handle}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-primary-700"
          >
            <span className="font-medium text-neutral-800 dark:text-neutral-200">{org.name}</span>
            <Badge color="zinc">{orgRoleLabel[org.role] ?? org.role}</Badge>
          </Link>
        ))}
      </div>
    </div>
  )
}
