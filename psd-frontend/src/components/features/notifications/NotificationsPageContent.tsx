'use client'

import { EmptyState } from '@/components/common/EmptyState'
import { QueryView } from '@/components/common/QueryView'
import { NotificationItem } from '@/components/features/notifications/NotificationItem'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import { getNotifications, markAllRead, markRead } from '@/lib/api/notifications'
import { Button } from '@/shared/Button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Filter = 'all' | 'unread'

export function NotificationsPageContent() {
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const router = useRouter()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', 'page', filter, page],
    queryFn: () => getNotifications(filter === 'unread', page),
  })

  const markOne = useMutation({
    mutationFn: markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const handleItemClick = async (id: string, link: string | null) => {
    await markOne.mutateAsync(id)
    if (link) router.push(link)
  }

  const unreadOnPage = query.data?.items.some((n) => !n.read)

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title="Notifikasi"
        subtitle="Pemberitahuan aktivitas, komunitas, dan pembaruan akun Anda."
        variant="compact"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
          {(['all', 'unread'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFilter(key)
                setPage(1)
              }}
              className={clsx(
                'rounded-full px-4 py-1.5 text-sm font-medium transition',
                filter === key
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
              )}
            >
              {key === 'all' ? 'Semua' : 'Belum dibaca'}
            </button>
          ))}
        </div>

        {unreadOnPage && (
          <Button
            type="button"
            plain
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="text-sm"
          >
            Tandai semua dibaca
          </Button>
        )}
      </div>

      <QueryView
        query={query}
        empty={
          <EmptyState
            title="Belum ada notifikasi"
            description={
              filter === 'unread'
                ? 'Semua notifikasi sudah dibaca.'
                : 'Aktivitas baru akan muncul di sini.'
            }
          />
        }
      >
        {(data) => (
          <div className="space-y-1 rounded-2xl border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900">
            {data.items.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={() => handleItemClick(n.id, n.link)}
              />
            ))}
          </div>
        )}
      </QueryView>

      {query.data && query.data.total > query.data.page_size && (
        <div className="mt-6 flex justify-center gap-2">
          <Button
            type="button"
            outline
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Sebelumnya
          </Button>
          <Button
            type="button"
            outline
            disabled={page * query.data.page_size >= query.data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </FeaturePageShell>
  )
}
