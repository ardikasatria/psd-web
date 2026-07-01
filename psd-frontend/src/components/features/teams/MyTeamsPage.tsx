'use client'

import { TeamCard } from '@/components/features/teams/TeamCard'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import { getMyInvites, respondInvite } from '@/lib/api/teams'
import { fetchMyTeams, MY_TEAMS_QUERY_KEY } from '@/lib/teams/myTeamsQuery'
import { roleLabel } from '@/lib/teams/permissions'
import { useAuth } from '@/lib/auth/useAuth'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { MyTeam, TeamInvite, TeamSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

const roleLabelMap = roleLabel

export function MyTeamsPage() {
  useAuthGuard('/me/teams')
  const { user } = useAuth()
  const isOrg = user?.account_type === 'organization'
  const qc = useQueryClient()

  const teamsQuery = useQuery({
    queryKey: MY_TEAMS_QUERY_KEY,
    queryFn: fetchMyTeams,
  })

  const invitesQuery = useQuery({
    queryKey: ['my-team-invites'],
    queryFn: async () => {
      const res = await getMyInvites()
      return res.items as TeamInvite[]
    },
  })

  const respond = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) => respondInvite(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-team-invites'] })
      qc.invalidateQueries({ queryKey: MY_TEAMS_QUERY_KEY })
    },
  })

  const myTeams = teamsQuery.data ?? []
  const invites = invitesQuery.data ?? []

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title="Tim saya"
        subtitle="Tim yang Anda ikuti dan undangan yang menunggu tanggapan."
        actions={
          <div className="flex flex-wrap gap-2">
            {isOrg && (
              <ButtonPrimary href="/me/org/teams" outline>
                Hub organisasi
              </ButtonPrimary>
            )}
            <ButtonPrimary href="/me/orgs" outline>
              Organisasi saya
            </ButtonPrimary>
            <ButtonPrimary href="/orgs/new">Buat organisasi</ButtonPrimary>
            <ButtonPrimary href="/teams" outline>
              Jelajahi tim
            </ButtonPrimary>
          </div>
        }
      />

      {invites.length > 0 && (
        <section className="mb-8 space-y-3">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Undangan tim</h2>
          <div className="space-y-2">
            {invites.map((inv: TeamInvite) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{inv.team.name}</p>
                  <p className="text-sm text-neutral-500">Undangan bergabung</p>
                </div>
                <div className="flex gap-2">
                  <ButtonPrimary
                    type="button"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ id: inv.id, action: 'accept' })}
                  >
                    Terima
                  </ButtonPrimary>
                  <ButtonPrimary
                    type="button"
                    outline
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ id: inv.id, action: 'decline' })}
                  >
                    Tolak
                  </ButtonPrimary>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <QueryState
        isLoading={teamsQuery.isLoading}
        isError={teamsQuery.isError}
        error={teamsQuery.error}
        isEmpty={!myTeams.length}
        emptyTitle="Belum ada tim"
        emptyDescription="Buat tim baru atau terima undangan dari rekan."
        emptyAction={{ label: 'Buat tim', href: '/teams' }}
        skeletonColumns={2}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myTeams.map((t: MyTeam) => (
            <div key={t.slug} className="relative">
              <TeamCard team={{ slug: t.slug, name: t.name, avatar_url: t.avatar_url } as TeamSummary} />
              <Link
                href={`/teams/${t.slug}`}
                className="absolute end-3 top-3 rounded-lg bg-white/90 px-2 py-1 text-xs font-medium shadow-sm dark:bg-neutral-800/90"
              >
                <Badge color="zinc">{roleLabelMap[t.role] ?? t.role}</Badge>
              </Link>
            </div>
          ))}
        </div>
      </QueryState>
    </FeaturePageShell>
  )
}
