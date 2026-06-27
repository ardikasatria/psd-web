import { InstructorApplication, InstructorApplicationSchema } from '@/types/api'
import { apiFetch } from './client'
import { z } from 'zod'

export const applyInstructor = (b: { expertise: string; motivation_md: string }) =>
  apiFetch(`/me/instructor-application`, z.object({ id: z.string(), status: z.string() }), {
    method: 'POST',
    body: JSON.stringify(b),
  })

export const getMyInstructorApplication = () =>
  apiFetch<InstructorApplication | null>(`/me/instructor-application`, InstructorApplicationSchema.nullable())
