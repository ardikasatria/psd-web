import ButtonPrimary from '@/shared/ButtonPrimary'

interface EmptyStateProps {
  title: string
  description: string
  cta?: string
  href?: string
}

export function EmptyState({ title, description, cta, href }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-neutral-300 p-10 text-center sm:p-12 dark:border-neutral-600">
      <h4 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">{title}</h4>
      <p className="max-w-md text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
      {cta && href && <ButtonPrimary href={href}>{cta}</ButtonPrimary>}
    </div>
  )
}
