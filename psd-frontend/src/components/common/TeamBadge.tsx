import { TeamRef } from '@/types/api'
import { Badge } from '@/shared/Badge'
import Link from 'next/link'

export function TeamBadge({ team }: { team: TeamRef }) {
  return (
    <Link href={`/teams/${team.slug}`} onClick={(e) => e.stopPropagation()}>
      <Badge color="teal" className="pointer-events-auto">
        Tim {team.name}
      </Badge>
    </Link>
  )
}
