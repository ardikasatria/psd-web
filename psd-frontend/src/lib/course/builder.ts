import type { CourseLesson, QuizQuestion } from '@/types/api'

export type ModuleDraft = {
  title: string
  lessons: CourseLesson[]
}

export function newLessonId() {
  return `l_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function newQuizQuestionId() {
  return `q_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function emptyLesson(type: CourseLesson['type'] = 'reading'): CourseLesson {
  return {
    id: newLessonId(),
    title: '',
    type,
    duration_min: 15,
    content_md: type === 'reading' ? '' : null,
    video_url: type === 'video' ? '' : null,
    materials: [],
    quiz: type === 'quiz' ? [emptyQuizQuestion()] : undefined,
  }
}

export function emptyQuizQuestion(): QuizQuestion {
  return {
    id: newQuizQuestionId(),
    question: '',
    options: ['', '', ''],
    answer_index: 0,
    explanation: '',
  }
}

export function emptyModule(): ModuleDraft {
  return { title: 'Topik baru', lessons: [emptyLesson()] }
}

export function calcTotalMinutes(modules: ModuleDraft[]) {
  return modules.flatMap((m) => m.lessons).reduce((s, l) => s + (l.duration_min ?? 0), 0)
}

export function normalizeModules(modules: ModuleDraft[]): ModuleDraft[] {
  return modules.map((m) => ({
    title: m.title,
    lessons: m.lessons.map((l) => ({
      ...l,
      duration_min: l.duration_min ?? 0,
      materials: l.materials ?? [],
      content_md: l.type === 'reading' ? (l.content_md ?? '') : l.content_md ?? null,
      video_url: l.type === 'video' ? (l.video_url ?? '') : l.video_url ?? null,
      quiz: l.type === 'quiz' ? (l.quiz ?? []) : undefined,
    })),
  }))
}
