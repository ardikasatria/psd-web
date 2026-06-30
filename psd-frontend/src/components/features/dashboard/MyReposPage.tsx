'use client'

import { EmptyCTA } from '@/components/dashboard/EmptyCTA'
import { RepoRow } from '@/components/dashboard/rows/RepoRow'
import { QueryState } from '@/components/features/QueryState'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { useMe } from '@/lib/api/dashboard'
import { getPortfolio } from '@/lib/api/users'
import type { PaginatedRepoSummary, RepoKind, RepoSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useQuery } from '@tanstack/react-query'

const kindMeta: Record<
  RepoKind,
  { title: string; description: string; createHref: string; createLabel: string; exploreHref: string }
> = {
  project: {
    title: 'Proyek saya',
    description: 'Kelola proyek yang Anda buat dan publikasikan di PSD.',
    createHref: '/projects/new',
    createLabel: 'Buat proyek',
    exploreHref: '/projects',
  },
  dataset: {
    title: 'Dataset saya',
    description: 'Dataset yang Anda unggah dan bagikan ke komunitas.',
    createHref: '/datasets/new',
    createLabel: 'Buat dataset',
    exploreHref: '/datasets',
  },
  model: {
    title: 'Model saya',
    description: 'Model machine learning yang Anda publikasikan.',
    createHref: '/models/new',
    createLabel: 'Buat model',
    exploreHref: '/models',
  },
}

const dashboardPath: Record<RepoKind, string> = {
  project: '/dashboard/projects',
  dataset: '/dashboard/datasets',
  model: '/dashboard/models',
}

export function MyReposPage({ kind }: { kind: RepoKind }) {
  useAuthGuard(dashboardPath[kind])
  const me = useMe()
  const meta = kindMeta[kind]

  const query = useQuery<PaginatedRepoSummary>({
    enabled: !!me.data?.user?.username,
    queryKey: ['my-repos', kind, me.data?.user?.username],
    queryFn: () => getPortfolio(me.data!.user.username, { kind, page_size: 50 }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{meta.title}</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{meta.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonPrimary href={meta.createHref}>{meta.createLabel}</ButtonPrimary>
          <ButtonPrimary href={meta.exploreHref} outline>
            Jelajahi katalog
          </ButtonPrimary>
        </div>
      </div>

      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        isEmpty={!query.data?.items.length}
        emptyTitle={`Belum ada ${kind === 'project' ? 'proyek' : kind === 'dataset' ? 'dataset' : 'model'}`}
        emptyDescription="Mulai dengan membuat aset pertama Anda."
      >
        {query.data?.items.length ? (
          <div className="space-y-3">
            {query.data.items.map((r: RepoSummary) => (
              <RepoRow key={r.id} repo={r} />
            ))}
          </div>
        ) : (
          <EmptyCTA
            text={`Belum ada ${kind === 'project' ? 'proyek' : kind === 'dataset' ? 'dataset' : 'model'}.`}
            href={meta.createHref}
            cta={meta.createLabel}
          />
        )}
      </QueryState>
    </div>
  )
}
