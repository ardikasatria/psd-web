import { BlogPageContent } from '@/components/features/blog/BlogPageContent'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Berita & Informasi',
  description: 'Kabar terbaru dan wawasan sains data dari Projek Sains Data.',
}

export default function BlogPage() {
  return (
    <Suspense>
      <BlogPageContent />
    </Suspense>
  )
}
