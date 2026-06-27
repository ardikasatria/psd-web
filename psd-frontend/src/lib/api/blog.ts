import {
  BlogDetail,
  BlogDetailSchema,
  BlogImageUpload,
  BlogImageUploadSchema,
  BlogSlugResponse,
  BlogSlugResponseSchema,
  PaginatedBlogSummary,
  PaginatedBlogSummarySchema,
} from '@/types/api'
import { apiDelete, apiFetch, apiFetchForm, buildQuery } from './client'

export const getBlog = (params: { page?: number; page_size?: number; tag?: string; status?: string } = {}) =>
  apiFetch<PaginatedBlogSummary>(`/blog${buildQuery(params)}`, PaginatedBlogSummarySchema)

export const getArticle = (slug: string) => apiFetch<BlogDetail>(`/blog/${slug}`, BlogDetailSchema)

export const createArticle = (body: Record<string, unknown>) =>
  apiFetch<BlogSlugResponse>('/blog', BlogSlugResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateArticle = (slug: string, body: Record<string, unknown>) =>
  apiFetch<BlogSlugResponse>(`/blog/${slug}`, BlogSlugResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteArticle = (slug: string) => apiDelete(`/blog/${slug}`)

export const uploadBlogImage = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return apiFetchForm<BlogImageUpload>('/blog/images', BlogImageUploadSchema, fd)
}
