import { ThreadSummary } from '@/types/api'
import Link from 'next/link'

export function ThreadRow({ thread: t }: { thread: ThreadSummary }) {
  return (
    <Link
      href={`/forum/${t.id}`}
      className="block rounded-xl border border-neutral-100 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/50"
    >
      <h4 className="font-medium text-neutral-900 dark:text-neutral-100">{t.title}</h4>
      <p className="mt-1 text-xs text-neutral-500">
        oleh {t.author.username} · {t.replies} balasan
      </p>
      {t.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {t.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
