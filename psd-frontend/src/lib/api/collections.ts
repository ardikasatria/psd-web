import {
  Collection,
  CollectionSchema,
  PaginatedCollection,
  PaginatedCollectionSchema,
  SlugResponseSchema,
  TransformerHub,
  TransformerHubSchema,
} from '@/types/api'
import { z } from 'zod'
import { apiDelete, apiFetch, buildQuery } from './client'

export const listCollections = (q: { category?: string; featured?: boolean; page?: number } = {}) => {
  const params = new URLSearchParams()
  if (q.category) params.set('category', q.category)
  if (q.featured != null) params.set('featured', String(q.featured))
  if (q.page) params.set('page', String(q.page))
  const qs = params.toString()
  return apiFetch<PaginatedCollection>(`/collections${qs ? `?${qs}` : ''}`, PaginatedCollectionSchema)
}

export const getCollection = (slug: string) => apiFetch<Collection>(`/collections/${slug}`, CollectionSchema)

export const createCollection = (body: {
  title: string
  description_md?: string
  cover_url?: string | null
  category?: string | null
  is_featured?: boolean
  items?: { type: string; slug?: string; id?: string }[]
}) => apiFetch('/collections', SlugResponseSchema, { method: 'POST', body: JSON.stringify(body) })

export const updateCollection = (
  slug: string,
  body: Partial<{
    title: string
    description_md: string
    cover_url: string | null
    category: string | null
    is_featured: boolean
    items: { type: string; slug?: string; id?: string }[]
  }>,
) => apiFetch(`/collections/${slug}`, SlugResponseSchema, { method: 'PATCH', body: JSON.stringify(body) })

export const deleteCollection = (slug: string) => apiDelete(`/collections/${slug}`)

export const getTransformerHub = () => apiFetch<TransformerHub>('/hub/transformer', TransformerHubSchema)
