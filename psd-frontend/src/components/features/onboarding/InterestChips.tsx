'use client'

import clsx from 'clsx'
import { INTERESTS } from '@/lib/constants/interests'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  className?: string
}

export function InterestChips({ value, onChange, className }: Props) {
  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      {INTERESTS.map((item) => {
        const selected = value.includes(item.id)
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            className={clsx(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              selected
                ? 'border-primary-600 bg-primary-600/10 text-primary-700 dark:border-primary-400 dark:bg-primary-600/20 dark:text-primary-300'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800'
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
