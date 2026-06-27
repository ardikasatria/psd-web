'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'

function formatRemaining(ms: number) {
  if (ms <= 0) return '00:00:00'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':')
}

export function FramingCountdown({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState(() => new Date(deadline).getTime() - Date.now())

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining(new Date(deadline).getTime() - Date.now())
    }, 1000)
    return () => clearInterval(t)
  }, [deadline])

  const expired = remaining <= 0
  const urgent = remaining > 0 && remaining < 3600_000

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-3 rounded-2xl border px-4 py-2.5 font-mono text-sm tabular-nums',
        expired
          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
          : urgent
            ? 'border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-200'
            : 'border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300',
      )}
    >
      <span className="text-xs font-sans font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {expired ? 'Tenggang berakhir' : 'Sisa waktu framing'}
      </span>
      <span className="text-base font-semibold">{formatRemaining(remaining)}</span>
    </div>
  )
}

export function isFramingExpired(deadline: string | null | undefined) {
  if (!deadline) return false
  return new Date(deadline).getTime() <= Date.now()
}
