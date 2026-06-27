'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

export function useCatalogParams() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const page = Number(searchParams.get('page') ?? 1)
  const sort = searchParams.get('sort') ?? '-updated_at'
  const tagsParam = searchParams.get('tags') ?? ''
  const category = searchParams.get('category') || null
  const subcategory = searchParams.get('subcategory') || null
  const activeTags = useMemo(
    () => tagsParam.split(',').map((t) => t.trim()).filter(Boolean),
    [tagsParam],
  )

  const pushParams = useCallback(
    (next: { q?: string; sort?: string; tags?: string[]; category?: string | null; subcategory?: string | null; page?: number }) => {
      const params = new URLSearchParams()
      const qVal = next.q ?? q
      const sortVal = next.sort ?? sort
      const tagsVal = next.tags ?? activeTags
      const categoryVal = next.category !== undefined ? next.category : category
      const subcategoryVal = next.subcategory !== undefined ? next.subcategory : subcategory
      const pageVal = next.page ?? 1
      if (qVal) params.set('q', qVal)
      if (sortVal && sortVal !== '-updated_at') params.set('sort', sortVal)
      if (tagsVal.length) params.set('tags', tagsVal.join(','))
      if (categoryVal) params.set('category', categoryVal)
      if (subcategoryVal) params.set('subcategory', subcategoryVal)
      if (pageVal > 1) params.set('page', String(pageVal))
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    },
    [activeTags, category, pathname, q, router, sort, subcategory],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      const urlQ = searchParams.get('q') ?? ''
      if (q !== urlQ) pushParams({ q, page: 1 })
    }, 400)
    return () => clearTimeout(timer)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleTag(tag: string) {
    const next = activeTags.includes(tag)
      ? activeTags.filter((t) => t !== tag)
      : [...activeTags, tag]
    pushParams({ tags: next, page: 1 })
  }

  return { q, setQ, page, sort, tagsParam, activeTags, category, subcategory, pushParams, toggleTag }
}
