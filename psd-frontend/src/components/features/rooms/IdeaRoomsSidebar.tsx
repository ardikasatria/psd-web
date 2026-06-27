'use client'

import { sidebarGradientBr } from '@/components/common/featureGradients'
import { SidebarStatTile, sidebarCalloutClass, sidebarSectionClass, sidebarTipClass } from '@/components/common/SidebarStatTile'
import { RoomStatusBadge } from '@/components/features/rooms/room-utils'
import { listRooms } from '@/lib/api/rooms'
import { useAuth } from '@/lib/auth/useAuth'
import type { RoomSummary } from '@/types/api'
import {
  ArrowRightIcon,
  BoltIcon,
  ChatBubbleLeftEllipsisIcon,
  ClockIcon,
  LightBulbIcon,
  PuzzlePieceIcon,
  SparklesIcon,
  TrophyIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

const COLLAB_TIPS = [
  'Framing singkat tapi jelas — fokus pada konteks, tujuan, dan kebutuhan data agar tim cepat selaras.',
  'Ruang terbuka butuh energi: undang praktisi dari forum atau feed yang relevan dengan topik Anda.',
  'Setelah solusi selesai, tantangan kompetisi membuka pintu validasi dari komunitas yang lebih luas.',
  'Komponen masalah bisa ditambah siapa saja selama fase framing — semakin banyak sudut pandang, semakin tajam rumusan.',
]

type Props = {
  className?: string
  onCreateClick?: () => void
}

function formatDeadline(iso: string) {
  const d = new Date(iso)
  const diff = d.getTime() - Date.now()
  if (diff <= 0) return 'Berakhir'
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 48) return `${hours}j lagi`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function FramingAlert({ room }: { room: RoomSummary }) {
  return (
    <Link
      href={`/idea-rooms/${room.slug}`}
      className={clsx(sidebarGradientBr.ideaRoom, 'block transition hover:border-primary-300 dark:hover:border-neutral-600')}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
        <BoltIcon className="size-3.5" aria-hidden />
        Sedang framing
      </div>
      <p className="mt-2 line-clamp-2 font-medium text-neutral-900 dark:text-neutral-100">{room.title}</p>
      {room.framing_deadline && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
          <ClockIcon className="size-3.5 shrink-0" aria-hidden />
          {formatDeadline(room.framing_deadline)}
          {(room.components_count ?? 0) > 0 && (
            <span className="ms-1">· {room.components_count} komponen</span>
          )}
        </p>
      )}
    </Link>
  )
}

export function IdeaRoomsSidebar({ className, onCreateClick }: Props) {
  const { isLoggedIn } = useAuth()
  const tip = COLLAB_TIPS[new Date().getDate() % COLLAB_TIPS.length]

  const allRooms = useQuery({
    queryKey: ['idea-rooms', 'sidebar-stats'],
    queryFn: () => listRooms({ page: 1 }),
    staleTime: 60_000,
  })

  const rooms = allRooms.data?.items ?? []
  const framing = rooms.filter((r) => r.status === 'framing')
  const open = rooms.filter((r) => r.status === 'open')
  const solving = rooms.filter((r) => r.status === 'solving' || r.status === 'submitted')
  const done = rooms.filter((r) => r.status === 'finished' || r.status === 'challenged')
  const members = rooms.reduce((sum, r) => sum + r.member_count, 0)

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-2 gap-2">
        <SidebarStatTile label="Ruang aktif" value={open.length + framing.length + solving.length} icon={<LightBulbIcon className="size-4" />} />
        <SidebarStatTile label="Kolaborator" value={members} icon={<UserGroupIcon className="size-4" />} accent="sky" />
        <SidebarStatTile label="Framing" value={framing.length} icon={<ChatBubbleLeftEllipsisIcon className="size-4" />} accent="indigo" />
        <SidebarStatTile label="Selesai" value={done.length} icon={<TrophyIcon className="size-4" />} />
      </div>

      <section className={sidebarSectionClass}>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <UserGroupIcon className="size-4 text-primary-500" aria-hidden />
          Kapan masuk Ruang Ide?
        </h3>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
          <li>Punya masalah domain nyata (UMKM, pertanian, layanan publik) tapi butuh tim untuk merumuskan solusi data.</li>
          <li>Ingin berkontribusi sudut pandang saat ruang sedang framing — tanpa harus jadi pemilik ide.</li>
          <li>Siap mengubah solusi tim menjadi dataset sintesis atau tantangan kompetisi setelah fase selesai.</li>
        </ul>
        <nav className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
          <Link href="/synthesis" className="text-primary-600 hover:underline dark:text-primary-400">
            Data sintesis
          </Link>
          <Link href="/competitions" className="text-primary-600 hover:underline dark:text-primary-400">
            Kompetisi
          </Link>
          <Link href="/datasets" className="text-primary-600 hover:underline dark:text-primary-400">
            Dataset
          </Link>
          <Link href="/teams" className="text-primary-600 hover:underline dark:text-primary-400">
            Tim
          </Link>
        </nav>
      </section>

      {framing.length > 0 && (
        <section className={sidebarSectionClass}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <BoltIcon className="size-4 text-primary-500" />
            Butuh suara Anda
          </h3>
          <p className="mt-1 text-xs text-neutral-500">Ruang framing — masuk dan tambahkan sudut pandang.</p>
          <div className="mt-3 space-y-2">
            {framing.slice(0, 2).map((r) => (
              <FramingAlert key={r.slug} room={r} />
            ))}
          </div>
        </section>
      )}

      {open.length > 0 && (
        <section className={sidebarCalloutClass}>
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Ruang terbuka</h3>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            {open.length} ruang menerima anggota baru — gabung sebelum slot penuh.
          </p>
          <ul className="mt-3 space-y-2">
            {open.slice(0, 2).map((r) => (
              <li key={r.slug}>
                <Link href={`/idea-rooms/${r.slug}`} className="flex items-center justify-between gap-2 text-sm font-medium hover:text-primary-600 dark:hover:text-primary-400">
                  <span className="line-clamp-1">{r.title}</span>
                  <span className="shrink-0 text-xs text-neutral-500">
                    {r.max_members != null ? `${r.member_count}/${r.max_members}` : r.member_count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={sidebarSectionClass}>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <PuzzlePieceIcon className="size-4 text-indigo-500" />
          Alur kolaborasi
        </h3>
        <ol className="mt-3 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">1</span>
            Ajukan masalah & bentuk tim
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">2</span>
            Framing bersama — rumuskan masalah
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">3</span>
            Selesaikan solusi & publikasikan
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">4</span>
            Opsional: jadikan tantangan kompetisi
          </li>
        </ol>
      </section>

      <section className={sidebarTipClass}>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-800 dark:text-neutral-100">
          <SparklesIcon className="size-4" aria-hidden />
          Tips kolaborasi
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{tip}</p>
      </section>

      {isLoggedIn ? (
        <button
          type="button"
          onClick={onCreateClick}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <LightBulbIcon className="size-4" aria-hidden />
          Ajukan ide baru
        </button>
      ) : (
        <Link
          href="/login?next=/idea-rooms"
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Masuk untuk berkolaborasi
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      )}
    </aside>
  )
}
