import { Badge } from '@/shared/Badge'
import clsx from 'clsx'

export function FeaturedBadge({ className }: { className?: string }) {
  return (
    <Badge color="yellow" className={clsx('!text-[10px] !uppercase !tracking-wide', className)}>
      Pilihan
    </Badge>
  )
}
