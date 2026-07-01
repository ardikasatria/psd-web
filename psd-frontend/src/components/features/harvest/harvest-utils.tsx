'use client'

import { HarvestJobStatus } from '@/lib/api/harvest'
import { Badge } from '@/shared/Badge'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  NoSymbolIcon,
  PlayIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

const STATUS_META: Record<
  HarvestJobStatus,
  { label: string; color: 'zinc' | 'sky' | 'amber' | 'emerald' | 'red'; icon: typeof PlayIcon }
> = {
  draft: { label: 'Draft', color: 'zinc', icon: ClockIcon },
  queued: { label: 'Antrian', color: 'sky', icon: ClockIcon },
  running: { label: 'Berjalan', color: 'amber', icon: PlayIcon },
  completed: { label: 'Selesai', color: 'emerald', icon: CheckCircleIcon },
  failed: { label: 'Gagal', color: 'red', icon: XCircleIcon },
  canceled: { label: 'Dibatalkan', color: 'zinc', icon: NoSymbolIcon },
}

export function HarvestStatusBadge({ status }: { status: HarvestJobStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <Badge color={meta.color}>
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </Badge>
  )
}

export function isActiveHarvestStatus(status: HarvestJobStatus) {
  return status === 'queued' || status === 'running'
}

export const HARVEST_ERROR_HINTS: Record<string, string> = {
  ssrf_blocked: 'URL menunjuk ke target internal — gunakan API publik https yang diizinkan.',
  not_allowlisted: 'Domain belum diizinkan admin. Ajukan penambahan allowlist lewat dukungan.',
  bad_scheme: 'Gunakan protokol https:// untuk semua sumber API.',
  bad_url: 'Periksa format URL sumber Anda.',
  rate_limited: 'Terlalu banyak permintaan — tunggu sebentar lalu coba lagi.',
}

export function harvestErrorHint(code?: string) {
  if (!code) return null
  return HARVEST_ERROR_HINTS[code] ?? null
}

export function validateHttpsUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return 'URL sumber wajib diisi'
  if (!trimmed.startsWith('https://')) return 'Hanya URL https yang diizinkan'
  try {
    new URL(trimmed)
    return null
  } catch {
    return 'Format URL tidak valid'
  }
}

export function timeAgoHarvest(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} mnt lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam lalu`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
