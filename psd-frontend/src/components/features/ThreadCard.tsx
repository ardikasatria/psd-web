import { ThreadSummary } from '@/types/api'
import { timeAgo } from '@/lib/utils/format'
import { ArrowDownIcon, ArrowUpIcon, ChatBubbleLeftRightIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export function ThreadCard({ thread }: { thread: ThreadSummary }) {
  return (
    <Link
      href={`/forum/${thread.id}`}
      className="group block rounded-3xl border border-neutral-200/80 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
    >
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <ArrowUpIcon className="size-4 text-neutral-400" aria-hidden />
          <span
            className={`text-sm font-semibold tabular-nums ${
              thread.score > 0
                ? 'text-primary-600 dark:text-primary-400'
                : thread.score < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-neutral-500'
            }`}
          >
            {thread.score ?? 0}
          </span>
          <ArrowDownIcon className="size-4 text-neutral-400" aria-hidden />
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
          <ChatBubbleLeftRightIcon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
            {thread.title}
          </h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
            <span className="flex items-center gap-1">
              <UserCircleIcon className="size-4" aria-hidden />
              {thread.author.username}
            </span>
            <span>{thread.replies} balasan</span>
            <span>{timeAgo(thread.last_activity_at)}</span>
          </p>
          {thread.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {thread.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {(thread.reactions?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {thread.reactions.slice(0, 4).map((r) => (
                <span
                  key={r.emoji}
                  className="rounded-full bg-neutral-50 px-1.5 py-0.5 text-xs dark:bg-neutral-700/80"
                >
                  {r.emoji} {r.count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
