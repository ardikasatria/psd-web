import {
  AvatarUploadSchema,
  BannerUploadSchema,
  MeResponseSchema,
  OnboardingCompleteSchema,
  OnboardingSchema,
  PaginatedNotebookSummarySchema,
  PaginatedThreadSummarySchema,
  Profile,
  ProfileSchema,
  ProfileUpdate,
} from '@/types/api'
import { PaginatedMyEventRegistrationSchema, PaginatedMySubmissionSchema } from '@/types/api'
import { apiFetch, apiFetchForm, buildQuery } from './client'

export const getMySubmissions = (q: { page?: number; page_size?: number } = {}) =>
  apiFetch(`/me/submissions${buildQuery(q)}`, PaginatedMySubmissionSchema)

export const getMyEvents = (q: { page?: number; page_size?: number } = {}) =>
  apiFetch(`/me/events${buildQuery(q)}`, PaginatedMyEventRegistrationSchema)

export const getMyNotebooks = (q: { page?: number; page_size?: number } = {}) =>
  apiFetch(`/me/notebooks${buildQuery(q)}`, PaginatedNotebookSummarySchema)

export const getMyThreads = (q: { page?: number; page_size?: number } = {}) =>
  apiFetch(`/me/threads${buildQuery(q)}`, PaginatedThreadSummarySchema)

export const getMyProfile = async (): Promise<Profile> => {
  const res = await apiFetch('/auth/me', MeResponseSchema)
  return res.user
}

export const updateProfile = (body: ProfileUpdate) =>
  apiFetch('/me', ProfileSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const uploadAvatar = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return apiFetchForm('/me/avatar', AvatarUploadSchema, fd)
}

export const uploadBanner = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return apiFetchForm('/me/banner', BannerUploadSchema, fd)
}

export const getOnboarding = () => apiFetch('/me/onboarding', OnboardingSchema)

export const completeOnboarding = () =>
  apiFetch('/me/onboarding/complete', OnboardingCompleteSchema, { method: 'POST' })
