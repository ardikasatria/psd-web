'use client'

import { LearningPathEditor } from '@/components/admin/LearningPathEditor'
import { AdminPageHeader, AdminPageSkeleton } from '@/components/admin/AdminShared'
import { createLearningPath, updateLearningPath } from '@/lib/api/admin'
import { getLearningPath } from '@/lib/api/learn'
import { normalizePathItems } from '@/lib/learning/pathItems'
import type { PathItem } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { FormEvent, use, useEffect, useState } from 'react'

export default function AdminLearningPathEditPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: routeSlug } = use(params)
  const isNew = routeSlug === 'new'
  const router = useRouter()
  const qc = useQueryClient()

  const [slug, setSlug] = useState(isNew ? '' : routeSlug)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<PathItem[]>([])

  const detail = useQuery({
    queryKey: ['learning-path', routeSlug],
    queryFn: () => getLearningPath(routeSlug),
    enabled: !isNew,
  })

  useEffect(() => {
    if (detail.data) {
      setTitle(detail.data.title)
      setDescription(detail.data.description)
      setItems(normalizePathItems(detail.data.items, detail.data.course_slugs))
    }
  }, [detail.data])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'learning-paths'] })
    qc.invalidateQueries({ queryKey: ['learning-paths'] })
    qc.invalidateQueries({ queryKey: ['learning-path', slug] })
  }

  const save = useMutation({
    mutationFn: async () => {
      const body = { slug, title, description, items }
      if (isNew) return createLearningPath(body)
      return updateLearningPath(routeSlug, body)
    },
    onSuccess: (res) => {
      invalidate()
      router.push(`/admin/learning-paths/${res?.slug ?? slug}`)
    },
  })

  if (!isNew && detail.isLoading) return <AdminPageSkeleton />

  return (
    <div>
      <AdminPageHeader
        title={isNew ? 'Buat jalur belajar' : `Kurasi: ${title || routeSlug}`}
        description="Susun koleksi aset PSD per fase lingkaran."
        actions={
          <Button outline href="/admin/learning-paths">
            Kembali
          </Button>
        }
      />
      <form
        className="mt-6 max-w-4xl space-y-6"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <LearningPathEditor
          slug={slug}
          title={title}
          description={description}
          items={items}
          onSlugChange={setSlug}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onItemsChange={setItems}
          slugDisabled={!isNew}
        />
        <div className="flex gap-2">
          <ButtonPrimary type="submit" disabled={save.isPending || !slug.trim() || !title.trim()}>
            {save.isPending ? 'Menyimpan…' : 'Simpan jalur'}
          </ButtonPrimary>
          {!isNew && (
            <Button outline type="button" href={`/paths/${routeSlug}`}>
              Pratinjau publik
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
