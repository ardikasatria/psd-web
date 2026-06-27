import {
  DailyMicroSchema,
  MicroAdminDetailSchema,
  MicroAdminSummarySchema,
  MicroCompleteResultSchema,
  MicroLessonSchema,
  SlugResponseSchema,
  StreakSchema,
} from '@/types/api'
import { z } from 'zod'
import { apiFetch } from './client'

export const getDailyMicro = () => apiFetch('/micro/daily', DailyMicroSchema)

export const getMicro = (slug: string) => apiFetch(`/micro/${slug}`, MicroLessonSchema)

export const completeMicro = (slug: string, answers?: number[]) =>
  apiFetch(`/micro/${slug}/complete`, MicroCompleteResultSchema, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })

export const getStreak = () => apiFetch('/me/streak', StreakSchema)

export const listMicroAdmin = () => apiFetch('/admin/micro', z.array(MicroAdminSummarySchema))

export const getMicroAdmin = (slug: string) => apiFetch(`/admin/micro/${slug}`, MicroAdminDetailSchema)

export const createMicro = (body: Record<string, unknown>) =>
  apiFetch('/admin/micro', SlugResponseSchema, { method: 'POST', body: JSON.stringify(body) })

export const updateMicro = (slug: string, body: Record<string, unknown>) =>
  apiFetch(`/admin/micro/${slug}`, SlugResponseSchema, { method: 'PATCH', body: JSON.stringify(body) })
