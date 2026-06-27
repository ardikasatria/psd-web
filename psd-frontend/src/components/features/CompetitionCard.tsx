import { CategoryBadge } from '@/components/common/CategoryBadge'
import { Badge } from '@/shared/Badge'
import { FeaturedBadge } from '@/components/common/FeaturedBadge'
import { CompetitionSummary } from '@/types/api'
import { ChartBarIcon, TrophyIcon, UsersIcon } from '@heroicons/react/24/outline'
import { trackCompetitionClick } from '@/lib/analytics/entities'
import Image from 'next/image'
import Link from 'next/link'

const statusLabel: Record<string, string> = {
  active: 'Aktif',
  upcoming: 'Akan datang',
  past: 'Selesai',
}

const statusColor: Record<string, 'green' | 'yellow' | 'zinc'> = {
  active: 'green',
  upcoming: 'yellow',
  past: 'zinc',
}

export function CompetitionCard({ competition }: { competition: CompetitionSummary }) {
  return (
    <Link
      href={`/competitions/${competition.slug}`}
      onClick={() => trackCompetitionClick(competition)}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
    >
      <div className="relative aspect-[2/1] overflow-hidden">
        {competition.cover_url ? (
          <Image src={competition.cover_url} alt="" fill className="object-cover transition duration-300 group-hover:scale-105" unoptimized />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-primary-400 to-primary-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="relative flex items-center justify-between gap-2 px-5 py-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge color={statusColor[competition.status]}>{statusLabel[competition.status]}</Badge>
            {competition.featured && <FeaturedBadge />}
          </div>
          {competition.prize_pool && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm">
              <TrophyIcon className="size-4" aria-hidden />
              {competition.prize_pool}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
          {competition.title}
        </h3>
        {competition.sponsor && (
          <p className="mt-1.5 text-sm text-neutral-500">Diselenggarakan oleh {competition.sponsor}</p>
        )}
        <CategoryBadge category={competition.category} subcategory={competition.subcategory} className="mt-2" />
        <div className="mt-auto flex items-center gap-4 pt-4 text-sm text-neutral-500">
          <span className="flex items-center gap-1.5">
            <UsersIcon className="size-4" aria-hidden />
            {competition.participants} peserta
          </span>
          <span className="flex items-center gap-1.5">
            <ChartBarIcon className="size-4" aria-hidden />
            {competition.metric}
          </span>
        </div>
      </div>
    </Link>
  )
}
