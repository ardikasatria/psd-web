import type { CourseDetail, CourseSummary, LearningPathDetail, LearningPathSummary, PathItem } from '@/types/api'
import { countPhases, normalizePathItems } from '@/lib/learning/pathItems'
import { owners } from './users'

const budiAuthor = owners.budi
const psdPublisher = owners.psd

export type MockCourseExtra = {
  description?: string
  requirements_md?: string | null
  modules?: CourseDetail['modules']
  review_note?: string | null
  publisher?: CourseDetail['publisher']
  access_type?: 'lifetime' | 'limited'
  access_days?: number | null
}

export const mockCourseExtras: Record<string, MockCourseExtra> = {}

export const courses: CourseSummary[] = [
  {
    slug: 'pengantar-analisis-big-data',
    title: 'Pengantar Analisis Big Data',
    level: 'pemula',
    lessons_count: 6,
    cover_url: null,
    status: 'published',
    author: budiAuthor,
  },
  {
    slug: 'python-untuk-sains-data',
    title: 'Python untuk Sains Data',
    level: 'pemula',
    lessons_count: 2,
    cover_url: null,
    status: 'published',
    author: budiAuthor,
  },
  {
    slug: 'machine-learning-praktis',
    title: 'Machine Learning Praktis',
    level: 'menengah',
    lessons_count: 2,
    cover_url: null,
    status: 'published',
    author: budiAuthor,
  },
  {
    slug: 'nlp-bahasa-indonesia',
    title: 'NLP Bahasa Indonesia',
    level: 'menengah',
    lessons_count: 2,
    cover_url: null,
    status: 'published',
    author: budiAuthor,
  },
  {
    slug: 'computer-vision-pertanian',
    title: 'Computer Vision untuk Pertanian',
    level: 'mahir',
    lessons_count: 2,
    cover_url: null,
    status: 'published',
    author: budiAuthor,
  },
  {
    slug: 'visualisasi-data-interaktif',
    title: 'Visualisasi Data Interaktif',
    level: 'pemula',
    lessons_count: 2,
    cover_url: null,
    status: 'published',
    author: budiAuthor,
  },
  {
    slug: 'forecasting-umkm',
    title: 'Forecasting untuk UMKM',
    level: 'menengah',
    lessons_count: 2,
    cover_url: null,
    status: 'published',
    author: budiAuthor,
  },
  {
    slug: 'etika-dan-governance-data',
    title: 'Etika dan Governance Data',
    level: 'pemula',
    lessons_count: 2,
    cover_url: null,
    status: 'published',
    author: budiAuthor,
  },
]

/** In-memory state for mock LMS */
export type MockEnrollment = { expires_at: string | null; enrolled_at: string }
export const enrollments = new Map<string, MockEnrollment>([
  [
    'budi-santoso:pengantar-analisis-big-data',
    { expires_at: null, enrolled_at: '2025-01-15T08:00:00Z' },
  ],
])
export const completedLessons = new Set<string>(['budi-santoso:pengantar-analisis-big-data:l1'])

export type MockInstructorApplication = {
  userId: string
  expertise: string
  motivation_md: string
  status: 'pending' | 'approved' | 'rejected'
}

export const instructorApplications: MockInstructorApplication[] = []

export const authoredCourses: CourseSummary[] = [
  {
    slug: 'draft-nlp-advanced',
    title: 'NLP Lanjutan (Draft)',
    level: 'mahir',
    lessons_count: 1,
    cover_url: null,
    status: 'rejected',
    review_note: 'Tambahkan minimal 3 modul dan contoh latihan praktis.',
    author: budiAuthor,
  },
  {
    slug: 'pending-ml-review',
    title: 'Deep Learning untuk Pemula',
    level: 'menengah',
    lessons_count: 2,
    cover_url: null,
    status: 'pending_review',
    author: budiAuthor,
  },
]

export function calcTotalMinutesFromModules(modules: CourseDetail['modules']) {
  return modules.flatMap((m) => m.lessons).reduce((s, l) => s + (l.duration_min ?? 0), 0)
}

export function publicModules(modules: CourseDetail['modules']) {
  return modules.map((m) => ({
    ...m,
    lessons: m.lessons.map((l) => {
      const lesson = { ...l }
      if (lesson.quiz) {
        lesson.quiz = lesson.quiz.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options,
        }))
      }
      return lesson
    }),
  }))
}

export function lessonView(
  l: CourseDetail['modules'][0]['lessons'][0],
  canAccess: boolean,
  revealQuiz: boolean
) {
  const base = {
    id: l.id,
    title: l.title,
    type: l.type,
    duration_min: l.duration_min,
  }
  if (!canAccess) return { ...base, locked: true }
  const out: CourseDetail['modules'][0]['lessons'][0] = {
    ...base,
    content_md: l.content_md,
    video_url: l.video_url,
    materials: l.materials ?? [],
  }
  if (l.quiz) {
    out.quiz = revealQuiz
      ? l.quiz
      : l.quiz.map((q) => ({ id: q.id, question: q.question, options: q.options }))
  }
  return out
}

export function courseStatsFrom(slug: string, modules: CourseDetail['modules']) {
  const totalLessons = modules.flatMap((m) => m.lessons).length
  let enrolled = 0
  let completed = 0
  for (const key of enrollments.keys()) {
    const [, s] = key.split(':')
    if (s !== slug) continue
    enrolled++
    const [user] = key.split(':')
    const done = modules.flatMap((m) => m.lessons).filter((l) =>
      completedLessons.has(`${user}:${slug}:${l.id}`)
    ).length
    if (totalLessons > 0 && done >= totalLessons) completed++
  }
  return {
    enrolled,
    completed,
    lessons: totalLessons,
    completion_rate: enrolled ? Math.round((completed / enrolled) * 100) : 0,
  }
}

export function activeEnrollment(username: string | null | undefined, slug: string) {
  if (!username) return null
  const e = enrollments.get(`${username}:${slug}`)
  if (!e) return null
  if (e.expires_at && new Date(e.expires_at) < new Date()) return 'expired' as const
  return e
}

export function courseDetailOf(
  c: CourseSummary,
  username?: string | null,
  revealQuiz = false
): CourseDetail {
  const enr = activeEnrollment(username, c.slug)
  const hasEnrollment = username ? enrollments.has(`${username}:${c.slug}`) : false
  const enrolled = hasEnrollment
  const access_status = enr === 'expired' ? 'expired' : enr ? 'active' : 'none'
  const isOwnerStaff = revealQuiz
  const canAccessContent = isOwnerStaff || (enr !== null && enr !== 'expired')
  const extra = mockCourseExtras[c.slug]
  const review_note = c.review_note ?? extra?.review_note ?? null
  const publisher = c.status === 'published' ? (extra?.publisher ?? psdPublisher) : null

  let rawModules: CourseDetail['modules']
  let description: string
  let requirements_md: string | null = null

  if (c.slug === 'pengantar-analisis-big-data') {
    description =
      'Pelajari dasar-dasar analisis big data: dari pengumpulan data hingga insight bisnis. Cocok untuk pemula tanpa latar belakang teknis.'
    requirements_md = '- Familiar dengan komputer dasar\n- Tidak perlu pengalaman coding sebelumnya'
    rawModules = [
      {
        title: 'Dasar Big Data',
        lessons: [
          {
            id: 'l1',
            type: 'reading',
            title: 'Apa itu Big Data?',
            duration_min: 15,
            content_md:
              '## Big Data\n\nBig Data adalah kumpulan data yang **volume**, **kecepatan**, dan **variasi**-nya melebihi kapasitas pemrosesan tradisional.',
            video_url: null,
            materials: [
              {
                name: 'slide-pengantar.pdf',
                url: 'https://example.com/slide.pdf',
                size_bytes: 245_000,
                type: 'application/pdf',
              },
            ],
          },
          {
            id: 'l2',
            type: 'video',
            title: 'Ekosistem Hadoop & Spark',
            duration_min: 25,
            content_md: null,
            video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          },
          {
            id: 'l3',
            type: 'reading',
            title: 'Studi kasus UMKM Indonesia',
            duration_min: 20,
            content_md: '## Studi Kasus\n\nContoh penerapan big data di UMKM Lampung.',
            video_url: null,
          },
        ],
      },
      {
        title: 'Analisis Praktis',
        lessons: [
          {
            id: 'l4',
            type: 'reading',
            title: 'ETL dengan Python',
            duration_min: 30,
            content_md: '## ETL\n\nExtract, Transform, Load dengan Pandas.',
            video_url: null,
          },
          {
            id: 'l5',
            type: 'reading',
            title: 'Visualisasi dengan Pandas',
            duration_min: 25,
            content_md: '## Visualisasi\n\nMembuat chart interaktif.',
            video_url: null,
          },
          {
            id: 'l6',
            type: 'quiz',
            title: 'Quiz: Pengantar Big Data',
            duration_min: 10,
            quiz: [
              {
                id: 'q1',
                question: 'Apa yang dimaksud dengan volume dalam Big Data?',
                options: ['Kecepatan data', 'Jumlah data yang besar', 'Variasi format data'],
                answer_index: 1,
                explanation: 'Volume mengacu pada skala data yang sangat besar.',
              },
              {
                id: 'q2',
                question: 'Framework mana yang populer untuk pemrosesan batch?',
                options: ['React', 'Hadoop', 'Django'],
                answer_index: 1,
                explanation: 'Hadoop dikenal untuk pemrosesan data terdistribusi skala besar.',
              },
            ],
          },
        ],
      },
    ]
  } else {
    description = extra?.description ?? `Kursus ${c.title} untuk level ${c.level}.`
    requirements_md = extra?.requirements_md ?? null
    rawModules = extra?.modules ?? [
      {
        title: 'Modul 1',
        lessons: [
          {
            id: 'l1',
            type: 'reading',
            title: 'Pengenalan',
            duration_min: 15,
            content_md: `## Pengenalan\n\nSelamat datang di ${c.title}.`,
            video_url: null,
          },
          {
            id: 'l2',
            type: 'reading',
            title: 'Praktik',
            duration_min: 30,
            content_md: '## Praktik\n\nLatihan hands-on.',
            video_url: null,
          },
        ],
      },
    ]
  }

  const modules = rawModules.map((m) => ({
    ...m,
    lessons: m.lessons.map((l) => lessonView(l, canAccessContent, revealQuiz)),
  }))

  const extraAccess = extra
  const access_type = extraAccess?.access_type ?? (c.slug === 'forecasting-umkm' ? 'limited' : 'lifetime')
  const access_days = extraAccess?.access_days ?? (access_type === 'limited' ? 30 : null)

  return {
    ...c,
    description,
    requirements_md,
    modules,
    enrolled,
    publisher,
    review_note,
    total_duration_min: calcTotalMinutesFromModules(rawModules),
    access_type,
    access_days,
    access_status,
    stats: courseStatsFrom(c.slug, rawModules),
  }
}

export function myLearningOf(username: string) {
  const items = []
  const now = new Date()
  for (const [key, enr] of enrollments) {
    const [user, slug] = key.split(':')
    if (user !== username) continue
    const c = courses.find((x) => x.slug === slug)
    if (!c) continue
    const detail = courseDetailOf(c, username)
    const lessons = detail.modules.flatMap((m) => m.lessons)
    const done = lessons.filter((l) => completedLessons.has(`${username}:${slug}:${l.id}`)).length
    const next = lessons.find((l) => !completedLessons.has(`${username}:${slug}:${l.id}`))
    const expired = !!(enr.expires_at && new Date(enr.expires_at) < now)
    items.push({
      course: { slug: c.slug, title: c.title, cover_url: c.cover_url, level: c.level },
      completed: done,
      total: lessons.length,
      percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
      next_lesson_id: next?.id ?? null,
      expires_at: enr.expires_at,
      expired,
    })
  }
  return { items }
}

export function learnersOf(slug: string, page = 1, pageSize = 20) {
  const c = courses.find((x) => x.slug === slug) ?? authoredCourses.find((x) => x.slug === slug)
  const detail = c ? courseDetailOf(c, c.author?.username, true) : null
  const totalLessons = detail?.modules.flatMap((m) => m.lessons).length ?? 0
  const rows: Array<{
    user: { username: string; name: string; avatar_url: string | null }
    enrolled_at: string
    expires_at: string | null
    completed: number
    total: number
    percent: number
  }> = []
  for (const [key, enr] of enrollments) {
    const [, s] = key.split(':')
    if (s !== slug) continue
    const [username] = key.split(':')
    const user = owners[username as keyof typeof owners]
    if (!user) continue
    const done = (detail?.modules ?? [])
      .flatMap((m) => m.lessons)
      .filter((l) => completedLessons.has(`${username}:${slug}:${l.id}`)).length
    rows.push({
      user: { username: user.username, name: user.username, avatar_url: user.avatar_url },
      enrolled_at: enr.enrolled_at,
      expires_at: enr.expires_at,
      completed: done,
      total: totalLessons,
      percent: totalLessons ? Math.round((done / totalLessons) * 100) : 0,
    })
  }
  rows.sort((a, b) => b.enrolled_at.localeCompare(a.enrolled_at))
  const start = (page - 1) * pageSize
  return {
    items: rows.slice(start, start + pageSize),
    total: rows.length,
    page,
    page_size: pageSize,
  }
}

const pathItemsBySlug: Record<string, PathItem[]> = {
  'jalur-data-scientist': [
    { phase: 'belajar', type: 'course', ref: 'python-untuk-sains-data', title: 'Python untuk Sains Data' },
    { phase: 'belajar', type: 'course', ref: 'pengantar-analisis-big-data', title: 'Pengantar Analisis Big Data' },
    { phase: 'belajar', type: 'course', ref: 'machine-learning-praktis', title: 'Machine Learning Praktis' },
    { phase: 'buktikan', type: 'project', ref: 'budi-santoso/analisis-umkm-lampung', title: 'Analisis UMKM Lampung' },
    { phase: 'buktikan', type: 'dataset', ref: 'psd/ulasan-marketplace-id', title: 'Ulasan Marketplace ID' },
    { phase: 'berpeluang', type: 'competition', ref: 'prediksi-permintaan-umkm', title: 'Prediksi Permintaan Produk UMKM' },
  ],
  'jalur-nlp-indonesia': [
    { phase: 'belajar', type: 'course', ref: 'python-untuk-sains-data', title: 'Python untuk Sains Data' },
    { phase: 'belajar', type: 'course', ref: 'nlp-bahasa-indonesia', title: 'NLP Bahasa Indonesia' },
    { phase: 'buktikan', type: 'model', ref: 'psd/indobert-sentimen', title: 'IndoBERT Sentimen' },
    { phase: 'buktikan', type: 'idea_room', ref: 'nlp-sentimen-terbuka', title: 'Klasifikasi Sentimen Ulasan' },
    { phase: 'berpeluang', type: 'competition', ref: 'sentimen-ulasan-ecommerce', title: 'Klasifikasi Sentimen E-Commerce' },
  ],
  'jalur-umkm-analytics': [
    { phase: 'belajar', type: 'course', ref: 'pengantar-analisis-big-data', title: 'Pengantar Analisis Big Data' },
    { phase: 'belajar', type: 'course', ref: 'forecasting-umkm', title: 'Forecasting untuk UMKM' },
    { phase: 'buktikan', type: 'dataset', ref: 'umkm-lampung/penjualan-harian-2024', title: 'Penjualan Harian UMKM 2024' },
    { phase: 'buktikan', type: 'project', ref: 'psd/dashboard-umkm-nasional', title: 'Dashboard UMKM Nasional' },
    { phase: 'berpeluang', type: 'event', ref: 'hackathon-umkm-digital', title: 'Hackathon UMKM Digital' },
  ],
}

export const learningPaths: LearningPathSummary[] = [
  {
    slug: 'jalur-data-scientist',
    title: 'Jalur Data Scientist',
    courses_count: 4,
    description: 'Dari Python dasar hingga machine learning praktis — belajar, buktikan lewat proyek, dan ikuti kompetisi.',
    items_count: 6,
    phase_counts: { belajar: 3, buktikan: 2, berpeluang: 1 },
  },
  {
    slug: 'jalur-nlp-indonesia',
    title: 'Jalur NLP Indonesia',
    courses_count: 3,
    description: 'Spesialisasi NLP untuk teks berbahasa Indonesia dengan portofolio model dan Ruang Ide.',
    items_count: 5,
    phase_counts: { belajar: 2, buktikan: 2, berpeluang: 1 },
  },
  {
    slug: 'jalur-umkm-analytics',
    title: 'Jalur UMKM Analytics',
    courses_count: 3,
    description: 'Analisis dan forecasting khusus UMKM — dari course hingga event networking.',
    items_count: 5,
    phase_counts: { belajar: 2, buktikan: 2, berpeluang: 1 },
  },
]

export function pathItemsOf(slug: string): PathItem[] {
  return pathItemsBySlug[slug] ?? []
}

export function pathSummaryOf(p: LearningPathSummary): LearningPathSummary {
  const items = pathItemsOf(p.slug)
  const courseSlugs = items.filter((i) => i.type === 'course').map((i) => i.ref)
  return {
    ...p,
    courses_count: courseSlugs.length,
    items_count: items.length,
    phase_counts: countPhases(items),
  }
}

export function pathDetailOf(p: LearningPathSummary): LearningPathDetail {
  const items = pathItemsOf(p.slug)
  const course_slugs = items.filter((i) => i.type === 'course').map((i) => i.ref)
  return { ...pathSummaryOf(p), course_slugs, items }
}

export function setPathItems(slug: string, items: PathItem[]) {
  pathItemsBySlug[slug] = items
  const row = learningPaths.find((p) => p.slug === slug)
  if (row) {
    Object.assign(row, {
      items_count: items.length,
      phase_counts: countPhases(items),
      courses_count: items.filter((i) => i.type === 'course').length,
    })
  }
}
