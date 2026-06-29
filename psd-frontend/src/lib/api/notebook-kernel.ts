import {
  NotebookKernelRequest,
  NotebookKernelRequestSchema,
} from '@/types/api'
import { apiFetch, apiFetchForm } from './client'
import { z } from 'zod'

export const getMyNotebookKernelRequest = () =>
  apiFetch<NotebookKernelRequest | null>(
    '/me/notebook-kernel-request',
    NotebookKernelRequestSchema.nullable(),
  )

export type SubmitNotebookKernelRequestInput = {
  applicant_type: 'student' | 'umum'
  reason_md?: string
  nim?: string
  institution?: string
  ktm?: File | null
}

export const submitNotebookKernelRequest = (input: SubmitNotebookKernelRequestInput) => {
  const fd = new FormData()
  fd.set('applicant_type', input.applicant_type)
  fd.set('reason_md', input.reason_md ?? '')
  if (input.nim) fd.set('nim', input.nim)
  if (input.institution) fd.set('institution', input.institution)
  if (input.ktm) fd.set('ktm', input.ktm)
  return apiFetchForm('/me/notebook-kernel-request', NotebookKernelRequestSchema, fd)
}
