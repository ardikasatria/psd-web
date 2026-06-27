import { ActivitySummarySchema } from '@/types/api'
import { apiFetch } from './client'

export const getActivitySummary = () => apiFetch('/me/activity-summary', ActivitySummarySchema)
