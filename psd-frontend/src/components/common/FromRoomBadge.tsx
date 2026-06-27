import { FromRoomRef } from '@/types/api'
import { LightBulbIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export function FromRoomBadge({ room }: { room: FromRoomRef }) {
  return (
    <Link
      href={`/idea-rooms/${room.slug}`}
      className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800 transition hover:bg-violet-200 dark:bg-violet-900/50 dark:text-violet-200 dark:hover:bg-violet-900/70"
    >
      <LightBulbIcon className="size-3.5" aria-hidden />
      Dari Ruang Ide: {room.title}
    </Link>
  )
}
