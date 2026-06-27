import { Announcement, AnnouncementSchema, AdminAnnouncement, AdminAnnouncementSchema, IdResponse, IdResponseSchema } from '@/types/api'
import { z } from 'zod'
import { apiDelete, apiFetch } from './client'

export const getAnnouncements = () =>
  apiFetch<Announcement[]>('/announcements', z.array(AnnouncementSchema))

export const listAdminAnnouncements = () =>
  apiFetch<AdminAnnouncement[]>('/admin/announcements', z.array(AdminAnnouncementSchema))

export const createAnnouncement = (body: {
  title: string
  body_md: string
  level: 'info' | 'penting'
  active: boolean
}) =>
  apiFetch<IdResponse>('/admin/announcements', IdResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateAnnouncement = (
  id: string,
  body: Partial<{ title: string; body_md: string; level: 'info' | 'penting'; active: boolean }>
) =>
  apiFetch<IdResponse>(`/admin/announcements/${id}`, IdResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteAnnouncement = (id: string) => apiDelete(`/admin/announcements/${id}`)

export const setFeatured = (
  kind: 'competitions' | 'events' | 'repos',
  key: string,
  featured: boolean
) =>
  apiFetch<unknown>(`/admin/${kind}/${key}`, z.unknown(), {
    method: 'PATCH',
    body: JSON.stringify({ featured }),
  })
