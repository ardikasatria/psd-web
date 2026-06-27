import { MemberCardResponseSchema, ShareResolveSchema } from '@/types/api'
import { apiFetch } from './client'

export const getMemberCard = () => apiFetch('/me/member-card', MemberCardResponseSchema)

export const resolveShareToken = (token: string) =>
  apiFetch(`/share/${encodeURIComponent(token)}`, ShareResolveSchema)
