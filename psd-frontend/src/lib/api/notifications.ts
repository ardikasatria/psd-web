import {
  OkResponseSchema,
  PaginatedNotificationSchema,
  UnreadCountSchema,
} from '@/types/api'
import { apiFetch } from './client'

export const getNotifications = (unread = false, page = 1) =>
  apiFetch(
    `/me/notifications?unread=${unread}&page=${page}`,
    PaginatedNotificationSchema
  )

export const getUnreadCount = () =>
  apiFetch('/me/notifications/unread-count', UnreadCountSchema)

export const markRead = (id: string) =>
  apiFetch(`/me/notifications/${id}/read`, OkResponseSchema, { method: 'POST' })

export const markAllRead = () =>
  apiFetch('/me/notifications/read-all', OkResponseSchema, { method: 'POST' })

export type { Notification } from '@/types/api'
