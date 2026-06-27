import { Badge } from '@/shared/Badge'

export function SyntheticBadge({ className }: { className?: string }) {
  return (
    <Badge color="amber" className={className}>
      Data Sintesis
    </Badge>
  )
}
