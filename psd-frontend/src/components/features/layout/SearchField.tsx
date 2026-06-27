import Input from '@/shared/Input'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  'aria-label'?: string
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Cari...',
  className,
  'aria-label': ariaLabel = 'Cari',
}: SearchFieldProps) {
  return (
    <div className={clsx('relative max-w-lg', className)}>
      <MagnifyingGlassIcon
        className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400"
        aria-hidden
      />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="rounded-2xl border-neutral-200 bg-white py-3 ps-12 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
      />
    </div>
  )
}
