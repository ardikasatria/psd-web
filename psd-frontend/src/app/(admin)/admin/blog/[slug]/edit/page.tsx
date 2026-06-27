'use client'

import { AdminPageSkeleton } from '@/components/admin/AdminShared'
import { BlogArticleEditor } from '@/components/features/blog/BlogArticleEditor'
import { getArticle } from '@/lib/api/blog'
import { useQuery } from '@tanstack/react-query'
import { use } from 'react'

export default function AdminBlogEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const article = useQuery({ queryKey: ['blog', slug, 'edit'], queryFn: () => getArticle(slug) })

  if (article.isLoading) return <AdminPageSkeleton />
  if (!article.data) return <p className="p-8 text-center text-neutral-500">Artikel tidak ditemukan.</p>

  return <BlogArticleEditor article={article.data} />
}
