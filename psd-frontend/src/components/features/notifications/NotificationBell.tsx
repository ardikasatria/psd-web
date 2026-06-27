'use client'

import { NotificationItem } from '@/components/features/notifications/NotificationItem'
import { useAuth } from '@/lib/auth/useAuth'
import { getNotifications, getUnreadCount, markAllRead, markRead } from '@/lib/api/notifications'
import ButtonCircle from '@/shared/ButtonCircle'
import { Button } from '@/shared/Button'
import { Notification02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'

export function NotificationBell({ className }: { className?: string }) {
  const { isLoggedIn } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()

  const unreadCount = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    enabled: isLoggedIn,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  })

  const list = useQuery({
    queryKey: ['notifications', 'dropdown'],
    queryFn: () => getNotifications(false, 1),
    enabled: isLoggedIn,
  })

  const markOne = useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  if (!isLoggedIn) return null

  const count = unreadCount.data?.count ?? 0
  const ariaLabel =
    count > 0 ? `Notifikasi, ${count} belum dibaca` : 'Notifikasi, tidak ada yang belum dibaca'

  const handleItemClick = async (id: string, link: string | null) => {
    await markOne.mutateAsync(id)
    if (link) router.push(link)
  }

  return (
    <Popover className={clsx('relative', className)}>
      <PopoverButton
        as={ButtonCircle}
        className="relative"
        color="light"
        plain
        aria-label={ariaLabel}
      >
        {count > 0 && (
          <span className="absolute end-0.5 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-semibold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
        <HugeiconsIcon icon={Notification02Icon} size={24} />
      </PopoverButton>

      <PopoverPanel
        transition
        anchor={{ to: 'bottom end', gap: 12 }}
        className="z-40 w-[min(100vw-2rem,24rem)] rounded-2xl shadow-lg ring-1 ring-black/5 transition duration-200 ease-in-out data-closed:translate-y-1 data-closed:opacity-0 dark:ring-white/10"
      >
        <div className="rounded-2xl bg-white dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Notifikasi</h2>
            {count > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 dark:text-primary-400"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto p-2" aria-live="polite" aria-relevant="additions">
            {list.isLoading ? (
              <p className="px-3 py-6 text-center text-sm text-neutral-500">Memuat…</p>
            ) : (list.data?.items.length ?? 0) === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-neutral-500">Belum ada notifikasi</p>
            ) : (
              list.data?.items.slice(0, 8).map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  compact
                  onClick={() => handleItemClick(n.id, n.link)}
                />
              ))
            )}
          </div>

          <div className="border-t border-neutral-100 p-2 dark:border-neutral-800">
            <Button href="/notifications" plain className="w-full justify-center text-sm">
              Lihat semua
            </Button>
          </div>
        </div>
      </PopoverPanel>
    </Popover>
  )
}
