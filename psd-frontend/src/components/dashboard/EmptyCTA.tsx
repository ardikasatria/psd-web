import { EmptyState } from '@/components/common/EmptyState'

export function EmptyCTA({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="py-2">
      <EmptyState title={text} description="" cta={cta} href={href} />
    </div>
  )
}
