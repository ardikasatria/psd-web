import { DRIFT_STATUS_CLASS, DRIFT_STATUS_LABEL, type DriftStatus } from '@/lib/ml/driftStatus'
import clsx from 'clsx'

type Props = {
  status: DriftStatus
  className?: string
}

export function DriftStatusBadge({ status, className }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        DRIFT_STATUS_CLASS[status],
        className,
      )}
    >
      {DRIFT_STATUS_LABEL[status]}
    </span>
  )
}
