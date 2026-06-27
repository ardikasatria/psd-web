import {
  CourseDetail,
  CourseDetailSchema,
  CourseSummary,
  CourseSummarySchema,
  EnrollResponseSchema,
  LearningPathDetail,
  LearningPathDetailSchema,
  MyLearning,
  MyLearningSchema,
  PaginatedCourseLearner,
  PaginatedCourseLearnerSchema,
  PaginatedCourseSummary,
  PaginatedCourseSummarySchema,
  PaginatedCourseReviewSchema,
  PaginatedLearningPathSummary,
  PaginatedLearningPathSummarySchema,
  QuizResultSchema,
  UploadedMaterialSchema,
} from '@/types/api'
import { apiFetch, apiFetchForm, buildQuery } from './client'
import { z } from 'zod'

export const getCourses = (q: { level?: string; category?: string; subcategory?: string; page?: number; page_size?: number } = {}) =>
  apiFetch<PaginatedCourseSummary>(`/courses${buildQuery(q)}`, PaginatedCourseSummarySchema)

export const getCourse = (slug: string) =>
  apiFetch<CourseDetail>(`/courses/${slug}`, CourseDetailSchema)

export const enrollCourse = (slug: string) =>
  apiFetch(`/courses/${slug}/enroll`, EnrollResponseSchema, { method: 'POST' })

export const completeLesson = (slug: string, lessonId: string) =>
  apiFetch(`/courses/${slug}/lessons/${lessonId}/complete`, z.object({ ok: z.boolean() }), { method: 'POST' })

export const getMyLearning = () =>
  apiFetch<MyLearning>(`/me/learning`, MyLearningSchema)

export const getAuthoredCourses = () =>
  apiFetch<CourseSummary[]>(`/me/courses/authored`, z.array(CourseSummarySchema))

export const createCourse = (b: Record<string, unknown>) =>
  apiFetch(`/courses`, z.object({ slug: z.string() }), { method: 'POST', body: JSON.stringify(b) })

export const updateCourse = (slug: string, b: Record<string, unknown>) =>
  apiFetch(`/courses/${slug}`, z.object({ slug: z.string() }), { method: 'PATCH', body: JSON.stringify(b) })

export const submitCourseReview = (slug: string) =>
  apiFetch(`/courses/${slug}/submit-review`, z.object({ status: z.string() }), { method: 'POST' })

export const getReviewQueue = (page = 1) =>
  apiFetch(`/admin/courses/review-queue?page=${page}`, PaginatedCourseReviewSchema)

export const reviewCourse = (slug: string, decision: 'publish' | 'reject', note?: string) =>
  apiFetch(`/admin/courses/${slug}/review`, z.object({ status: z.string() }), {
    method: 'PATCH',
    body: JSON.stringify({ decision, note }),
  })

export const uploadMaterial = (slug: string, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return apiFetchForm(`/courses/${slug}/materials`, UploadedMaterialSchema, fd)
}

export const submitQuiz = (slug: string, lessonId: string, answers: number[]) =>
  apiFetch(`/courses/${slug}/lessons/${lessonId}/quiz/submit`, QuizResultSchema, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })

export const getLearningPaths = (q: { page?: number } = {}) =>
  apiFetch<PaginatedLearningPathSummary>(`/learning-paths${buildQuery(q)}`, PaginatedLearningPathSummarySchema)

export const getLearningPath = (slug: string) =>
  apiFetch<LearningPathDetail>(`/learning-paths/${slug}`, LearningPathDetailSchema)

export const getLearners = (slug: string, page = 1) =>
  apiFetch<PaginatedCourseLearner>(`/courses/${slug}/learners?page=${page}`, PaginatedCourseLearnerSchema)
