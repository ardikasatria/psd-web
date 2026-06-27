import type { CourseStatus } from '@/types/api'

export const courseStatusLabel: Record<CourseStatus, string> = {
  draft: 'Draft',
  pending_review: 'Menunggu tinjauan',
  published: 'Diterbitkan',
  rejected: 'Ditolak',
}

export const courseStatusColor: Record<CourseStatus, 'zinc' | 'yellow' | 'green' | 'red'> = {
  draft: 'zinc',
  pending_review: 'yellow',
  published: 'green',
  rejected: 'red',
}

export function canSubmitCourseReview(status?: CourseStatus) {
  return status === 'draft' || status === 'rejected'
}

export function isCourseEditorLocked(status?: CourseStatus) {
  return status === 'pending_review'
}
