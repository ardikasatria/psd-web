import {
  JourneyNextSchema,
  MyQuestsSchema,
  QuestClaimResultSchema,
  QuestSummarySchema,
  SlugResponseSchema,
} from '@/types/api'
import { z } from 'zod'
import { apiFetch } from './client'

export const getQuestCatalog = () => apiFetch('/quests', z.array(QuestSummarySchema))

export const getMyQuests = () => apiFetch('/me/quests', MyQuestsSchema)

export const claimQuest = (slug: string) =>
  apiFetch(`/me/quests/${slug}/claim`, QuestClaimResultSchema, { method: 'POST' })

export const getJourney = () => apiFetch('/me/journey', JourneyNextSchema)

export const createQuest = (body: Record<string, unknown>) =>
  apiFetch('/admin/quests', SlugResponseSchema, { method: 'POST', body: JSON.stringify(body) })

export const updateQuest = (slug: string, body: Record<string, unknown>) =>
  apiFetch(`/admin/quests/${slug}`, SlugResponseSchema, { method: 'PATCH', body: JSON.stringify(body) })
