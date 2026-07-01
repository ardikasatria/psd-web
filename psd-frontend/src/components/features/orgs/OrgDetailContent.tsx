'use client'

import { OrgAnnouncementsTab } from '@/components/features/orgs/OrgAnnouncementsTab'
import { OrgAssetsTab } from '@/components/features/orgs/OrgAssetsTab'
import { OrgMembersTab } from '@/components/features/orgs/OrgMembersTab'
import { OrgOpportunitiesTab } from '@/components/features/orgs/OrgOpportunitiesTab'
import { OrgOverviewTab } from '@/components/features/orgs/OrgOverviewTab'
import { OrgSettingsTab } from '@/components/features/orgs/OrgSettingsTab'
import { OrgTeamsTab } from '@/components/features/orgs/OrgTeamsTab'
import { OrgStatusBanner } from '@/components/features/orgs/OrgStatusBanner'
import { OrgVerificationBadge } from '@/components/features/orgs/OrgVerificationBadge'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { getOrg, leaveOrg } from '@/lib/api/orgs'
import { orgCan } from '@/lib/orgs/permissions'
import { isDemandOrg, orgTypeLabel } from '@/lib/orgs/org-utils'
import { orgTabActive, orgTabIdle, orgTextMuted } from '@/lib/orgs/org-ui'
import { MY_ORGS_QUERY_KEY } from '@/components/features/orgs/MyOrgsPage'
import { useAuth } from '@/lib/auth/useAuth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import { UserMinusIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'

const BASE_TABS = [
  { id: 'overview', label: 'Ikhtisar' },
  { id: 'announcements', label: 'Pengumuman' },
  { id: 'members', label: 'Anggota', memberOnly: true },
  { id: 'teams', label: 'Tim', memberOnly: true },
  { id: 'assets', label: 'Aset', memberOnly: true },
  { id: 'opportunities', label: 'Peluang', demandOnly: true },
  { id: 'settings', label: 'Pengaturan', memberOnly: true },
] as const

type TabId = (typeof BASE_TABS)[number]['id']

function visibleTabs(isMember: boolean, isDemand: boolean, myRole?: string | null) {
  return BASE_TABS.filter((t) => {
    if ('memberOnly' in t && t.memberOnly && !isMember) return false
    if ('demandOnly' in t && t.demandOnly && !isDemand) return false
    if (t.id === 'settings' && isMember) {
      const canAny =
        orgCan(myRole, 'manage_settings') ||
        orgCan(myRole, 'manage_verification') ||
        orgCan(myRole, 'manage_billing') ||
        orgCan(myRole, 'delete_org')
      if (!canAny) return false
    }
    return true
  })
}

function tabFromParams(
  params: URLSearchParams,
  isMember: boolean,
  isDemand: boolean,
  myRole?: string | null,
): TabId {
  const raw = params.get('tab') as TabId | null
  const tabs = visibleTabs(isMember, isDemand, myRole)
  if (!raw || !tabs.some((t) => t.id === raw)) return 'overview'
  return raw
}

function OrgDetailInner({ handle }: { handle: string }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabId>('overview')
  const [leaveError, setLeaveError] = useState<string | null>(null)

  const orgQuery = useQuery({
    queryKey: ['org', handle],
    queryFn: () => getOrg(handle),
  })

  const org = orgQuery.data
  const isMember = !!org?.my_role
  const isDemand = org ? isDemandOrg(org.type) : false
  const myRole = org?.my_role

  useEffect(() => {
    setTab(tabFromParams(searchParams, isMember, isDemand, myRole))
  }, [searchParams, isMember, isDemand, myRole])

  const selectTab = useCallback(
    (id: TabId) => {
      setTab(id)
      const params = new URLSearchParams(searchParams.toString())
      if (id === 'overview') params.delete('tab')
      else params.set('tab', id)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const leaveMut = useMutation({
    mutationFn: () => leaveOrg(org!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MY_ORGS_QUERY_KEY })
      router.push('/me/orgs')
    },
    onError: (e: Error) => setLeaveError(e.message),
  })

  const tabs = visibleTabs(isMember, isDemand, myRole)
  const canLeave = isMember && isLoggedIn

  return (
    <DetailPageShell>
      <QueryState
        isLoading={orgQuery.isLoading}
        isError={orgQuery.isError}
        error={orgQuery.error}
        isEmpty={!org}
        emptyTitle="Organisasi tidak ditemukan"
      >
        {org && (
          <>
            <DetailPageHeader
              title={org.name}
              subtitle={`@${org.handle}`}
              badges={
                <>
                  <Badge color="sky">{orgTypeLabel[org.type as keyof typeof orgTypeLabel]}</Badge>
                  <OrgVerificationBadge status={org.verification} />
                  {org.suspended && <Badge color="red">Ditangguhkan</Badge>}
                </>
              }
              actions={
                canLeave ? (
                  <ButtonPrimary
                    type="button"
                    outline
                    onClick={() => leaveMut.mutate()}
                    disabled={leaveMut.isPending}
                  >
                    <UserMinusIcon className="size-4" />
                    Keluar
                  </ButtonPrimary>
                ) : undefined
              }
            />

            {leaveError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{leaveError}</p>}

            {isMember && (
              <OrgStatusBanner handle={handle} verification={org.verification} type={org.type} />
            )}

            <nav className="mb-6 flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-700">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTab(t.id)}
                  className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    tab === t.id ? orgTabActive : orgTabIdle
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            {tab === 'overview' && (
              <OrgOverviewTab org={org} handle={handle} myRole={myRole} isMember={isMember} />
            )}
            {tab === 'announcements' && (
              <OrgAnnouncementsTab
                orgId={org.id}
                handle={handle}
                org={org}
                myRole={myRole}
                isMember={isMember}
              />
            )}
            {tab === 'members' && isMember && (
              <OrgMembersTab orgId={org.id} handle={handle} org={org} myRole={myRole} />
            )}
            {tab === 'teams' && isMember && (
              <OrgTeamsTab orgId={org.id} handle={handle} org={org} myRole={myRole} />
            )}
            {tab === 'assets' && isMember && (
              <OrgAssetsTab orgId={org.id} handle={handle} org={org} myRole={myRole} />
            )}
            {tab === 'opportunities' && isDemand && isMember && (
              <OrgOpportunitiesTab orgId={org.id} handle={handle} org={org} myRole={myRole} />
            )}
            {tab === 'settings' && isMember && (
              <OrgSettingsTab orgId={org.id} handle={handle} org={org} myRole={myRole} />
            )}
          </>
        )}
      </QueryState>
    </DetailPageShell>
  )
}

export function OrgDetailContent({ handle }: { handle: string }) {
  return (
    <Suspense fallback={null}>
      <OrgDetailInner handle={handle} />
    </Suspense>
  )
}
