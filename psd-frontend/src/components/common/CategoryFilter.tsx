'use client'

import { getCategories, getCategory } from '@/lib/api/categories'
import type { Category, Subcategory } from '@/types/api'
import Select from '@/shared/Select'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'

type Props = {
  category: string | null
  subcategory: string | null
  onChange: (category: string | null, subcategory: string | null) => void
  className?: string
}

export function CategoryFilter({ category, subcategory, onChange, className }: Props) {
  const categoryId = useId()
  const subcategoryId = useId()
  const mains = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const detail = useQuery({
    queryKey: ['category', category],
    queryFn: () => getCategory(category!),
    enabled: !!category,
  })

  const subcategories = detail.data?.subcategories ?? []
  const showSubcategory = !!category && subcategories.length > 0

  return (
    <div className={clsx('flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center', className)}>
      <div className="w-full sm:w-44">
        <Select
          id={categoryId}
          aria-label="Kategori"
          value={category ?? ''}
          onChange={(e) => {
            const value = e.target.value
            onChange(value || null, null)
          }}
          disabled={mains.isLoading}
          className="!rounded-xl"
        >
          <option value="">{mains.isLoading ? 'Memuat…' : 'Semua kategori'}</option>
          {(mains.data ?? []).map((cat: Category) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </Select>
      </div>

      {showSubcategory && (
        <div className="w-full sm:w-44">
          <Select
            id={subcategoryId}
            aria-label="Subkategori"
            value={subcategory ?? ''}
            onChange={(e) => {
              const value = e.target.value
              onChange(category, value || null)
            }}
            disabled={detail.isLoading}
            className="!rounded-xl"
          >
            <option value="">{detail.isLoading ? 'Memuat…' : 'Semua subkategori'}</option>
            {subcategories.map((sub: Subcategory) => (
              <option key={sub.slug} value={sub.slug}>
                {sub.name}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  )
}
