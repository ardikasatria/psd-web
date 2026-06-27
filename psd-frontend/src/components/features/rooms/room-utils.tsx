import { ComponentKind, RoomStatus } from '@/types/api'
import { Badge } from '@/shared/Badge'
import clsx from 'clsx'

type BadgeColor = 'zinc' | 'sky' | 'violet' | 'amber' | 'cyan' | 'indigo' | 'blue' | 'green' | 'rose'

const STATUS_META: Record<RoomStatus, { label: string; color: BadgeColor }> = {
  draft: { label: 'Draft', color: 'zinc' },
  open: { label: 'Terbuka', color: 'sky' },
  framing: { label: 'Framing', color: 'violet' },
  closed: { label: 'Tertutup', color: 'amber' },
  generating: { label: 'Menghasilkan data', color: 'cyan' },
  solving: { label: 'Menyelesaikan', color: 'indigo' },
  submitted: { label: 'Terkirim', color: 'blue' },
  finished: { label: 'Selesai', color: 'green' },
  challenged: { label: 'Ditantang', color: 'rose' },
}

export function RoomStatusBadge({ status, className }: { status: RoomStatus; className?: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: 'zinc' as BadgeColor }
  return (
    <Badge color={meta.color} className={clsx('font-medium tracking-wide', className)}>
      {meta.label}
    </Badge>
  )
}

export const COMPONENT_KIND_LABEL: Record<ComponentKind, string> = {
  context: 'Konteks',
  constraint: 'Batasan',
  goal: 'Tujuan',
  data_need: 'Kebutuhan Data',
  metric: 'Metrik',
}

export const COMPONENT_KIND_DESC: Record<ComponentKind, string> = {
  context: 'Latar belakang masalah dan situasi saat ini',
  constraint: 'Batasan teknis, regulasi, atau sumber daya',
  goal: 'Hasil yang ingin dicapai',
  data_need: 'Data yang dibutuhkan untuk menyelesaikan masalah',
  metric: 'Cara mengukur keberhasilan solusi',
}

export const COMPONENT_KINDS: ComponentKind[] = ['context', 'constraint', 'goal', 'data_need', 'metric']
