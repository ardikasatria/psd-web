'use client'

import { BlogCard } from '@/components/features/blog/BlogCard'
import { PersonalizedFeedSection } from '@/components/features/assistant/PersonalizedFeedSection'
import { CompetitionCard } from '@/components/features/CompetitionCard'
import { AnnouncementBanner } from '@/components/common/AnnouncementBanner'
import { EventCard } from '@/components/features/EventCard'
import { QueryState } from '@/components/features/QueryState'
import { RepoCard } from '@/components/features/RepoCard'
import {
  FeaturePageHero,
  FeaturePageShell,
  FeatureSection,
  QuickNavGrid,
  QuickNavItem,
} from '@/components/features/layout'
import { getCompetitions } from '@/lib/api/competitions'
import { getBlog } from '@/lib/api/blog'
import { getEvents } from '@/lib/api/events'
import { getDiscover } from '@/lib/api/repos'
import { useAuth } from '@/lib/auth/useAuth'
import {
  BlogSummary,
  CompetitionSummary,
  Discover,
  EventSummary,
  PaginatedCompetitionSummary,
  PaginatedEventSummary,
  RepoSummary,
} from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import {
  AcademicCapIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  CubeIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

const quickNavItems: QuickNavItem[] = [
  {
    label: 'Explore',
    description: 'Jelajahi semua aset',
    href: '/explore',
    icon: MagnifyingGlassIcon,
    gradient: 'from-primary-500 to-primary-700',
  },
  {
    label: 'Proyek',
    description: 'Solusi sains data',
    href: '/projects',
    icon: FolderIcon,
    gradient: 'from-rose-400 to-primary-600',
  },
  {
    label: 'Dataset',
    description: 'Data terbuka lokal',
    href: '/datasets',
    icon: CubeIcon,
    gradient: 'from-blue-400 to-indigo-600',
  },
  {
    label: 'Model',
    description: 'Model ML siap pakai',
    href: '/models',
    icon: BeakerIcon,
    gradient: 'from-violet-400 to-purple-600',
  },
  {
    label: 'Kompetisi',
    description: 'Tantangan & hadiah',
    href: '/competitions',
    icon: TrophyIcon,
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    label: 'Belajar',
    description: 'Kursus & jalur',
    href: '/learn',
    icon: AcademicCapIcon,
    gradient: 'from-emerald-400 to-teal-600',
  },
]

export function HomeContent() {
  const { isLoggedIn } = useAuth()
  const discover = useQuery<Discover>({
    queryKey: ['discover'],
    queryFn: getDiscover,
  })
  const competitions = useQuery<PaginatedCompetitionSummary>({
    queryKey: ['competitions', 'active'],
    queryFn: () => getCompetitions({ status: 'active', page_size: 3 }),
  })
  const events = useQuery<PaginatedEventSummary>({
    queryKey: ['events', 'featured'],
    queryFn: () => getEvents({ page_size: 3 }),
  })
  const blog = useQuery({
    queryKey: ['blog', 'home'],
    queryFn: () => getBlog({ page_size: 3 }),
  })

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title="Platform sains data kolaboratif"
        dimHeading="untuk Indonesia"
        subtitle="Temukan dataset, model, dan kompetisi yang menghubungkan riset dengan UMKM dan organisasi lokal."
        actions={
          <>
            <ButtonPrimary href="/explore">Jelajahi aset</ButtonPrimary>
            <Button href="/competitions" outline className="!border-white/30 !text-white hover:!bg-white/10">
              Lihat kompetisi
            </Button>
          </>
        }
      />

      <AnnouncementBanner className="mb-2" />

      {isLoggedIn && <PersonalizedFeedSection className="mb-8" />}

      <FeatureSection title="Jelajahi fitur" subtitle="Akses cepat ke seluruh ekosistem PSD">
        <QuickNavGrid items={quickNavItems} />
      </FeatureSection>

      <FeatureSection
        title="Pilihan PSD"
        subtitle="Kurasi tim Projek Sains Data"
        seeAllHref="/explore"
        withBackground
      >
        <QueryState
          isLoading={discover.isLoading}
          isError={discover.isError}
          error={discover.error}
          isEmpty={!discover.data?.featured.length}
          emptyTitle="Belum ada aset pilihan"
          emptyDescription="Tim PSD akan menandai aset unggulan segera."
          emptyAction={{ label: 'Jelajahi aset', href: '/explore' }}
          skeletonColumns={3}
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(discover.data?.featured ?? []).map((repo: RepoSummary) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        </QueryState>
      </FeatureSection>

      <FeatureSection
        title="Terbaru"
        subtitle="Aset yang baru diperbarui"
        seeAllHref="/explore?sort=-updated_at"
      >
        <QueryState
          isLoading={discover.isLoading}
          isError={discover.isError}
          error={discover.error}
          isEmpty={!discover.data?.recent.length}
          emptyTitle="Belum ada aset terbaru"
          emptyDescription="Jelajahi aset dari komunitas PSD."
          emptyAction={{ label: 'Jelajahi aset', href: '/explore' }}
          skeletonColumns={3}
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(discover.data?.recent ?? []).map((repo: RepoSummary) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        </QueryState>
      </FeatureSection>

      <FeatureSection
        title="Kompetisi aktif"
        subtitle="Ikuti tantangan sains data dengan konteks lokal"
        seeAllHref="/competitions"
      >
        <QueryState
          isLoading={competitions.isLoading}
          isError={competitions.isError}
          error={competitions.error}
          isEmpty={!competitions.data?.items.length}
          emptyTitle="Tidak ada kompetisi aktif"
          emptyDescription="Pantau halaman kompetisi untuk peluang berikutnya."
          emptyAction={{ label: 'Lihat kompetisi', href: '/competitions' }}
        >
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {(competitions.data?.items ?? []).map((c: CompetitionSummary) => (
              <CompetitionCard key={c.slug} competition={c} />
            ))}
          </div>
        </QueryState>
      </FeatureSection>

      <FeatureSection
        title="Event mendatang"
        subtitle="Webinar, hackathon, dan meetup komunitas"
        seeAllHref="/events"
        withBackground
      >
        <QueryState
          isLoading={events.isLoading}
          isError={events.isError}
          error={events.error}
          isEmpty={!events.data?.items.length}
          emptyTitle="Belum ada event"
          emptyDescription="Ikuti event komunitas untuk belajar dan berjejaring."
          emptyAction={{ label: 'Lihat event', href: '/events' }}
        >
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {(events.data?.items ?? []).map((e: EventSummary) => (
              <EventCard key={e.slug} event={e} />
            ))}
          </div>
        </QueryState>
      </FeatureSection>

      <FeatureSection
        title="Berita"
        subtitle="Kabar terbaru dari Projek Sains Data"
        seeAllHref="/blog"
      >
        <QueryState
          isLoading={blog.isLoading}
          isError={blog.isError}
          error={blog.error}
          isEmpty={!blog.data?.items.length}
          emptyTitle="Belum ada berita"
          emptyDescription="Tim PSD akan mempublikasikan artikel segera."
          emptyAction={{ label: 'Lihat blog', href: '/blog' }}
        >
          <div className="mx-auto max-w-3xl divide-y divide-neutral-200 dark:divide-neutral-800">
            {(blog.data?.items ?? []).map((article: BlogSummary) => (
              <BlogCard key={article.slug} article={article} className="py-8 first:pt-0" />
            ))}
          </div>
        </QueryState>
      </FeatureSection>

      <section className="relative overflow-hidden rounded-[32px] bg-neutral-900 px-8 py-12 lg:rounded-[40px] lg:px-14 lg:py-16 dark:bg-neutral-800">
        <div className="pointer-events-none absolute -end-20 -top-20 size-64 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="relative z-10 flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Bergabung dengan komunitas PSD</h2>
            <p className="mt-3 text-neutral-400">
              Diskusikan ide, bagikan proyek, dan berkolaborasi dengan praktisi sains data di seluruh Indonesia.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonPrimary href="/community">
              <ChatBubbleLeftRightIcon className="size-5" data-slot="icon" />
              Kunjungi komunitas
            </ButtonPrimary>
            <Link
              href="/register"
              className="inline-flex items-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Daftar gratis
            </Link>
          </div>
        </div>
      </section>
    </FeaturePageShell>
  )
}
