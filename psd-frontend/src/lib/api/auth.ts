import {
  AuthResponseSchema,
  LoginBodySchema,
  MeResponseSchema,
  OkResponseSchema,
  RegisterBodySchema,
} from '@/types/api'
import { apiFetch } from './client'

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

export const getMe = () => apiFetch('/auth/me', MeResponseSchema)

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
