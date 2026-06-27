import type { MicroAdminDetail } from '@/types/api'

/** Map slug kategori publik → ID di database (sesuai seed backend). */
export const CATEGORY_SLUG_TO_ID: Record<string, string> = {
  nlp: 'cat_nlp',
  'computer-vision': 'cat_cv',
  tabular: 'cat_tab',
  umkm: 'cat_umkm',
}

export function categoryIdFromSlug(slug: string): string | null {
  if (!slug) return null
  return CATEGORY_SLUG_TO_ID[slug] ?? null
}

export function categorySlugFromId(id: string | null | undefined): string {
  if (!id) return ''
  const entry = Object.entries(CATEGORY_SLUG_TO_ID).find(([, v]) => v === id)
  return entry?.[0] ?? ''
}

export function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export type QuizQuestionDraft = {
  id: string
  question: string
  options: string[]
  answer_index: number
  explanation: string
}

export type MicroAdminForm = {
  slug: string
  title: string
  content_md: string
  duration_min: number
  category_slug: string
  active: boolean
  quiz: QuizQuestionDraft[]
}

export function emptyQuizQuestion(index = 0): QuizQuestionDraft {
  return {
    id: `q${index + 1}`,
    question: '',
    options: ['', ''],
    answer_index: 0,
    explanation: '',
  }
}

export function emptyMicroForm(): MicroAdminForm {
  return {
    slug: '',
    title: '',
    content_md: '',
    duration_min: 5,
    category_slug: '',
    active: true,
    quiz: [],
  }
}

export function detailToForm(detail: MicroAdminDetail): MicroAdminForm {
  return {
    slug: detail.slug,
    title: detail.title,
    content_md: detail.content_md,
    duration_min: detail.duration_min,
    category_slug: categorySlugFromId(detail.category_id),
    active: detail.active,
    quiz: detail.quiz.map((q, i) => ({
      id: q.id || `q${i + 1}`,
      question: q.question,
      options: q.options.length >= 2 ? q.options : ['', ''],
      answer_index: q.answer_index ?? 0,
      explanation: q.explanation ?? '',
    })),
  }
}

export function formToBody(form: MicroAdminForm, isEdit: boolean): Record<string, unknown> {
  const quiz = form.quiz
    .filter((q) => q.question.trim())
    .map((q) => ({
      id: q.id.trim() || slugifyTitle(q.question).slice(0, 24) || 'q1',
      question: q.question.trim(),
      options: q.options.map((o) => o.trim()).filter(Boolean),
      answer_index: q.answer_index,
      explanation: q.explanation.trim() || undefined,
    }))
    .filter((q) => q.options.length >= 2)

  const body: Record<string, unknown> = {
    title: form.title.trim(),
    content_md: form.content_md,
    duration_min: form.duration_min,
    category_id: categoryIdFromSlug(form.category_slug),
    quiz,
    active: form.active,
  }
  if (!isEdit) body.slug = form.slug.trim()
  return body
}

export function validateMicroForm(form: MicroAdminForm, isEdit: boolean): string | null {
  if (!form.title.trim()) return 'Judul wajib diisi.'
  if (!isEdit && !form.slug.trim()) return 'Alamat URL (slug) wajib diisi.'
  if (form.duration_min < 1) return 'Durasi minimal 1 menit.'
  for (const q of form.quiz) {
    if (!q.question.trim()) continue
    const filled = q.options.map((o) => o.trim()).filter(Boolean)
    if (filled.length < 2) return 'Setiap pertanyaan quiz perlu minimal 2 pilihan jawaban.'
    if (q.answer_index >= filled.length) return 'Pilih jawaban benar untuk setiap pertanyaan quiz.'
  }
  return null
}
