import {
  CategoryDetailSchema,
  CategoryRefSchema,
  CategorySchema,
  SubcategorySchema,
} from '@/types/api'
import { z } from 'zod'
import { apiDelete, apiFetch } from './client'

const SubcategoryCreatedSchema = SubcategorySchema.extend({ parent: z.string() })

export const getCategories = () => apiFetch('/categories', z.array(CategorySchema))

export const getCategory = (slug: string) => apiFetch(`/categories/${slug}`, CategoryDetailSchema)

export const addSubcategory = (slug: string, name: string) =>
  apiFetch(`/categories/${slug}/subcategories`, SubcategoryCreatedSchema, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

export const createCategory = (body: { name: string; description?: string }) =>
  apiFetch('/admin/categories', CategoryRefSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateCategory = (slug: string, body: { name?: string; description?: string }) =>
  apiFetch(`/admin/categories/${slug}`, CategoryRefSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteCategory = (slug: string) => apiDelete(`/admin/categories/${slug}`)
