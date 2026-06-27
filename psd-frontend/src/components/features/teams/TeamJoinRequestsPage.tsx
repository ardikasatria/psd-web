'use client'

import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { decideRequest, getTeam, listJoinRequests } from '@/lib/api/teams'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { TeamJoinRequest } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

export function TeamJoinRequestsPage({ slug }: { slug: string }) {
  useAuthGuard(`/teams/${slug}/requests`)
  const qc = useQueryClient()

  const teamQuery = useQuery({
    queryKey: ['team', slug],
    queryFn: () => getTeam(slug),
  })

  const requestsQuery = useQuery({
    queryKey: ['team-join-requests', slug],
    queryFn: async () => {
      const res = await listJoinRequests(slug)
      return res.items as TeamJoinRequest[]
    },
    enabled: !!teamQuery.data,
  })

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) =>
      decideRequest(slug, id, decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-join-requests', slug] })
      qc.invalidateQueries({ queryKey: ['team', slug] })
    },
  })

  const isAdmin = teamQuery.data?.my_role === 'owner' || teamQuery.data?.my_role === 'admin'
  const items = requestsQuery.data ?? []

  if (teamQuery.isLoading) {
    return (
      <DetailPageShell>
        <p className="text-neutral-500">Memuat…</p>
      </DetailPageShell>
    )
  }

  if (!isAdmin) {
    return (
      <DetailPageShell>
        <p className="text-red-600">Hanya admin/owner yang dapat mengelola permintaan.</p>
        <Link href={`/teams/${slug}`} className="mt-4 inline-block text-sm text-primary-600">
          ← Kembali ke tim
        </Link>
      </DetailPageShell>
    )
  }

  return (
    <DetailPageShell>
      <Link href={`/teams/${slug}`} className="inline-flex text-sm font-medium text-neutral-500 hover:text-primary-600">
        ← {teamQuery.data?.name ?? 'Tim'}
      </Link>

      <DetailPageHeader
        title="Permintaan bergabung"
        subtitle="Setujui atau tolak permintaan dari pengguna yang ingin bergabung."
      />

      <QueryState
        isLoading={requestsQuery.isLoading}
        isError={requestsQuery.isError}
        error={requestsQuery.error}
        isEmpty={!items.length}
        emptyTitle="Tidak ada permintaan"
        emptyDescription="Permintaan bergabung baru akan muncul di sini."
        skeletonColumns={2}
      >
        <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200/80 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-800">
          {items.map((req: TeamJoinRequest) => (
            <li key={req.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {req.user.name ?? req.user.username}
                </p>
                <p className="text-sm text-neutral-500">@{req.user.username}</p>
              </div>
              <div className="flex gap-2">
                <ButtonPrimary
                  type="button"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: req.id, decision: 'approve' })}
                >
                  Setujui
                </ButtonPrimary>
                <ButtonPrimary
                  type="button"
                  outline
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: req.id, decision: 'reject' })}
                >
                  Tolak
                </ButtonPrimary>
              </div>
            </li>
          ))}
        </ul>
      </QueryState>
    </DetailPageShell>
  )
}
