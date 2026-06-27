import type { Notification } from '@/types/api'

type MockNotification = Notification & { user_id: string }

export const mockNotifications: MockNotification[] = [
  {
    id: 'ntf_01',
    user_id: 'usr_psd',
    type: 'follow',
    title: 'budi-santoso mulai mengikuti Anda',
    body: '',
    link: '/budi-santoso',
    actor: { username: 'budi-santoso', avatar_url: null, type: 'user' },
    read: false,
    created_at: new Date(Date.now() - 3 * 60_000).toISOString(),
  },
  {
    id: 'ntf_02',
    user_id: 'usr_psd',
    type: 'post_like',
    title: 'Postingan Anda disukai',
    body: '',
    link: '/community',
    actor: { username: 'siti-rahayu', avatar_url: null, type: 'user' },
    read: false,
    created_at: new Date(Date.now() - 45 * 60_000).toISOString(),
  },
  {
    id: 'ntf_03',
    user_id: 'usr_psd',
    type: 'course',
    title: 'Kursus baru tersedia',
    body: 'Pengenalan Machine Learning untuk UMKM',
    link: '/learn',
    actor: null,
    read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString(),
  },
  {
    id: 'ntf_04',
    user_id: 'usr_mod',
    type: 'instructor',
    title: 'Pengajuan instruktur baru dari budi-santoso',
    body: 'Budi Santoso',
    link: '/admin/instructor-applications',
    actor: { username: 'budi-santoso', avatar_url: null, type: 'user' },
    read: false,
    created_at: new Date(Date.now() - 20 * 60_000).toISOString(),
  },
]

export function notificationsForUser(userId: string): Notification[] {
  return mockNotifications
    .filter((n) => n.user_id === userId)
    .map(({ user_id: _, ...n }) => n)
}

export function unreadCountForUser(userId: string): number {
  return mockNotifications.filter((n) => n.user_id === userId && !n.read).length
}
