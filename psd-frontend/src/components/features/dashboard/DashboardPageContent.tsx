'use client'

import { OnboardingChecklist } from '@/components/features/onboarding/OnboardingChecklist'
import { PersonalizedFeedSection } from '@/components/features/assistant/PersonalizedFeedSection'
import { JourneyNextCard } from '@/components/features/quests/JourneyNextCard'
import { DailyLearningWidget } from '@/components/features/micro/DailyLearningWidget'
import { EmptyCTA } from '@/components/dashboard/EmptyCTA'
import { CompetitionRow } from '@/components/dashboard/rows/CompetitionRow'
import { EventRow } from '@/components/dashboard/rows/EventRow'
import { MyEventRow } from '@/components/dashboard/rows/MyEventRow'
import { RepoRow } from '@/components/dashboard/rows/RepoRow'
import { SubmissionRow } from '@/components/dashboard/rows/SubmissionRow'
import { ThreadRow } from '@/components/dashboard/rows/ThreadRow'
import { Section } from '@/components/dashboard/Section'
import { StatCard } from '@/components/dashboard/StatCard'
import { LearningProgressRow } from '@/components/dashboard/rows/LearningProgressRow'
import {
  useActiveCompetitions,
  useExploreDatasets,
  useMe,
  useMyAssetCount,
  useMyEvents,
  useMyLearning,
  useMyPortfolio,
  useMySubmissions,
  useMyThreads,
  useUpcomingEvents,
} from '@/lib/api/dashboard'
import { Button } from '@/shared/Button'
import Skeleton from '@/components/Skeleton'
import {
  CalendarDaysIcon,
  CubeIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import type {
  CompetitionSummary,
  EventSummary,
  LearningProgress,
  MyEventRegistration,
  MySubmission,
  RepoSummary,
  ThreadSummary,
} from '@/types/api'

export function DashboardPageContent() {
  const me = useMe()
  const username = me.data?.user.username

  const comps = useActiveCompetitions()
  const events = useUpcomingEvents()
  const mySubs = useMySubmissions()
  const myEvents = useMyEvents()
  const portfolio = useMyPortfolio(username)
  const threads = useMyThreads()
  const courses = useMyLearning()
  const datasets = useExploreDatasets()
  const assetCount = useMyAssetCount(username)

  const greeting = me.data?.user.name

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {me.isLoading ? (
            <Skeleton className="h-9 w-64 rounded-lg" />
          ) : (
            <h2 className="text-2xl font-semibold text-neutral-900 sm:text-3xl dark:text-neutral-100">
              Selamat datang{greeting ? `, ${greeting}` : ''}
            </h2>
          )}
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Ringkasan aktivitas Anda di Projek Sains Data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/projects/new">Buat proyek</Button>
          <Button href="/notebooks" outline>
            Mulai notebook
          </Button>
          <Button href="/competitions" outline>
            Ikuti kompetisi
          </Button>
          <Button href="/forum" outline>
            Tulis di forum
          </Button>
        </div>
      </section>

      <JourneyNextCard />

      <PersonalizedFeedSection />

      <DailyLearningWidget />

      <OnboardingChecklist />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Aset saya"
          value={assetCount.isLoading ? '—' : (assetCount.data ?? '—')}
          href="/dashboard/projects"
          icon={<CubeIcon className="size-5" />}
        />
        <StatCard
          label="Kompetisi aktif"
          value={comps.isLoading ? '—' : (comps.data?.total ?? '—')}
          href="/competitions"
          icon={<TrophyIcon className="size-5" />}
        />
        <StatCard
          label="Event mendatang"
          value={events.isLoading ? '—' : (events.data?.total ?? '—')}
          href="/events"
          icon={<CalendarDaysIcon className="size-5" />}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Kompetisi aktif"
          href="/competitions"
          query={comps}
          empty={
            <EmptyCTA text="Belum ada kompetisi aktif." href="/competitions" cta="Jelajahi kompetisi" />
          }
        >
          {(items: CompetitionSummary[]) => (
            <div className="space-y-3">
              {items.map((c) => (
                <CompetitionRow key={c.slug} competition={c} />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Submission saya"
          href="/dashboard/competitions"
          query={mySubs}
          empty={
            <EmptyCTA
              text="Belum ada submission. Ikuti kompetisi pertama."
              href="/competitions"
              cta="Ikuti kompetisi"
            />
          }
        >
          {(items: MySubmission[]) => (
            <div className="space-y-3">
              {items.map((s) => (
                <SubmissionRow key={s.id} submission={s} />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Event mendatang"
          href="/events"
          query={events}
          empty={
            <EmptyCTA text="Belum ada event terjadwal." href="/events" cta="Lihat semua event" />
          }
        >
          {(items: EventSummary[]) => (
            <div className="space-y-3">
              {items.map((e) => (
                <EventRow key={e.slug} event={e} />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Event saya"
          href="/dashboard/events"
          query={myEvents}
          empty={
            <EmptyCTA
              text="Anda belum terdaftar di event mana pun."
              href="/events"
              cta="Jelajahi event"
            />
          }
        >
          {(items: MyEventRegistration[]) => (
            <div className="space-y-3">
              {items.map((r) => (
                <MyEventRow key={r.registration_id} registration={r} />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Aset terbaru saya"
          href="/dashboard/projects"
          query={portfolio}
          empty={
            <EmptyCTA
              text="Anda belum punya aset. Mulai dari proyek pertama."
              href="/projects/new"
              cta="Buat proyek"
            />
          }
        >
          {(items: RepoSummary[]) => (
            <div className="space-y-3">
              {items.map((r) => (
                <RepoRow key={r.id} repo={r} />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Lanjutkan belajar"
          href="/dashboard/learning"
          query={courses}
          empty={
            <EmptyCTA text="Belum enrol course. Mulai perjalanan belajar Anda." href="/learn" cta="Mulai belajar" />
          }
        >
          {(items: LearningProgress[]) => (
            <div className="space-y-3">
              {items.map((item) => (
                <LearningProgressRow key={item.course.slug} item={item} />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Diskusi saya"
          href="/dashboard/community"
          query={threads}
          empty={
            <EmptyCTA text="Belum ada diskusi. Mulai utas pertama." href="/forum" cta="Tulis di forum" />
          }
        >
          {(items: ThreadSummary[]) => (
            <div className="space-y-3">
              {items.map((t) => (
                <ThreadRow key={t.id} thread={t} />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Jelajahi dataset"
          href="/datasets"
          query={datasets}
          empty={
            <EmptyCTA text="Belum ada dataset." href="/datasets" cta="Jelajahi dataset" />
          }
        >
          {(items: RepoSummary[]) => (
            <div className="space-y-3">
              {items.map((d) => (
                <RepoRow key={d.id} repo={d} />
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
