'use client'

import { Badge } from '@/shared/Badge'

export function AssetCardChips({ card }: { card: Record<string, unknown> }) {
  const entries = Object.entries(card)
  if (!entries.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([k, v]) => {
        if (v == null || v === '') return null
        const label =
          Array.isArray(v) ? (
            <span key={k} className="flex flex-wrap gap-1">
              {v.map((item) => (
                <Badge key={String(item)} color="sky">
                  {String(item)}
                </Badge>
              ))}
            </span>
          ) : (
            <Badge key={k} color="zinc">
              <span className="font-normal text-neutral-500 dark:text-neutral-400">{k}: </span>
              {String(v)}
            </Badge>
          )
        return <span key={k}>{label}</span>
      })}
    </div>
  )
}
