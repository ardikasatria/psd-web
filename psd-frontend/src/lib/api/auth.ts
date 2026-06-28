import {
  AuthResponseSchema,
  LoginBodySchema,
  MeResponseSchema,
  OkResponseSchema,
  RegisterBodySchema,
} from '@/types/api'
import { z } from 'zod'
import { apiFetch, ApiError, API_BASE, API_PREFIX } from './client'

export const register = async (body: {
  username: string
  email: string
  password: string
  name: string
  accept_tos: true
}) =>
  apiFetch('/auth/register', AuthResponseSchema, {
    method: 'POST',
    body: JSON.stringify(RegisterBodySchema.parse(body)),
  })

export const login = async (body: { email: string; password: string }) =>
  apiFetch('/auth/login', AuthResponseSchema, {
    method: 'POST',
    body: JSON.stringify(LoginBodySchema.parse(body)),
  })

export const getMe = async (): Promise<z.infer<typeof MeResponseSchema>> => {
  const res = await fetch(`${API_BASE}${API_PREFIX}/auth/me`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (res.status === 401) {
    return { user: null }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const e = body?.error ?? {}
    const code = e.code ?? 'unknown'
    const message =
      code === 'rate_limited'
        ? 'Terlalu banyak permintaan, coba lagi sebentar lagi.'
        : (e.message ?? res.statusText)
    throw new ApiError(res.status, code, message, e.details)
  }
  return MeResponseSchema.parse(await res.json())
}

export const logout = () => apiFetch('/auth/logout', OkResponseSchema, { method: 'POST' })

export const changePassword = (body: { current_password: string; new_password: string }) =>
  apiFetch('/auth/change-password', OkResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const forgotPassword = (body: { email: string }) =>
  apiFetch('/auth/forgot-password', OkResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const resetPassword = (body: { token: string; new_password: string }) =>
  apiFetch('/auth/reset-password', OkResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const changeEmail = (body: { new_email: string; password: string }) =>
  apiFetch('/auth/change-email', OkResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const verifyEmail = (body: { token: string }) =>
  apiFetch('/auth/verify-email', OkResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const resendVerification = () =>
  apiFetch('/auth/resend-verification', OkResponseSchema, { method: 'POST' })

export const acceptTos = () => apiFetch('/me/accept-tos', OkResponseSchema, { method: 'POST' })
