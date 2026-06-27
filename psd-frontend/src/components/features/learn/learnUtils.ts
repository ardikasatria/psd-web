import { CourseDetail, LearningProgress } from '@/types/api'

export const levelLabel: Record<CourseDetail['level'], string> = {
  pemula: 'Pemula',
  menengah: 'Menengah',
  mahir: 'Mahir',
}

export const levelColor: Record<CourseDetail['level'], 'green' | 'yellow' | 'red'> = {
  pemula: 'green',
  menengah: 'yellow',
  mahir: 'red',
}

export function allLessons(course: CourseDetail) {
  return course.modules.flatMap((m) => m.lessons)
}

export function totalDurationMin(course: Pick<CourseDetail, 'modules' | 'total_duration_min'>) {
  if (course.total_duration_min != null && course.total_duration_min > 0) {
    return course.total_duration_min
  }
  return course.modules.flatMap((m) => m.lessons).reduce((s, l) => s + (l.duration_min ?? 0), 0)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`
}

export const lessonTypeLabel = {
  reading: 'Bacaan',
  video: 'Video',
  quiz: 'Quiz',
} as const

export type LessonType = keyof typeof lessonTypeLabel

export function isLessonDone(
  lessonId: string,
  lessons: ReturnType<typeof allLessons>,
  progress: Pick<LearningProgress, 'next_lesson_id' | 'completed' | 'total'> | undefined,
) {
  if (!progress) return false
  if (progress.next_lesson_id) {
    const nextIdx = lessons.findIndex((l) => l.id === progress.next_lesson_id)
    const idx = lessons.findIndex((l) => l.id === lessonId)
    return idx >= 0 && idx < nextIdx
  }
  return progress.completed === progress.total && progress.total > 0
}

export function getLearningPosition(course: CourseDetail, progress?: LearningProgress) {
  const lessons = allLessons(course)
  if (!lessons.length) return null

  const targetId =
    progress?.next_lesson_id ??
    (progress && progress.completed >= progress.total && progress.total > 0
      ? lessons[lessons.length - 1]?.id
      : lessons[0]?.id)

  if (!targetId) return null

  for (let mi = 0; mi < course.modules.length; mi++) {
    const mod = course.modules[mi]
    const li = mod.lessons.findIndex((l) => l.id === targetId)
    if (li >= 0) {
      return {
        moduleIndex: mi,
        moduleTitle: mod.title,
        lesson: mod.lessons[li],
        lessonIndex: li,
      }
    }
  }
  return null
}

export function focusLessonHref(slug: string, lessonId: string) {
  return `/learn/${slug}/${lessonId}`
}

export function hasActiveAccess(course: Pick<CourseDetail, 'access_status'>) {
  return course.access_status === 'active'
}

export function formatAccessLabel(course: Pick<CourseDetail, 'access_type' | 'access_days'>) {
  if (course.access_type === 'limited' && course.access_days) {
    return `Akses ${course.access_days} hari`
  }
  return 'Akses selamanya'
}

export function formatAccessExpiry(expiresAt: string | null | undefined) {
  if (!expiresAt) return 'Selamanya'
  return new Date(expiresAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function getVideoEmbed(url: string): { type: 'iframe' | 'video'; src: string } | null {
  if (!url?.trim()) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/)
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` }
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` }
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { type: 'video', src: url }
  if (url.startsWith('http')) return { type: 'iframe', src: url }
  return null
}
