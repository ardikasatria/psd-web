import type { MicroLesson, Streak } from '@/types/api'

type MockMicroItem = MicroLesson & {
  active?: boolean
  category_id?: string | null
}

export const mockMicroStore: MockMicroItem[] = [
  {
    slug: 'apa-itu-dataframe',
    title: 'Apa itu DataFrame?',
    content_md:
      '## Konsep singkat\n\nDataFrame adalah struktur data tabular — seperti spreadsheet — yang paling sering dipakai di pandas.',
    duration_min: 5,
    has_quiz: true,
    active: true,
    category_id: 'cat_tab',
    quiz: [
      {
        id: 'q1',
        question: 'Apa yang biasanya direpresentasikan oleh baris dalam DataFrame?',
        options: ['Variabel', 'Observasi', 'Indeks waktu', 'Header'],
        answer_index: 1,
        explanation: 'Setiap baris umumnya adalah satu observasi.',
      },
    ],
  },
  {
    slug: 'visualisasi-cepat',
    title: 'Visualisasi cepat dengan matplotlib',
    content_md: '## Plot sederhana\n\nGunakan `plt.plot()` untuk garis dan `plt.bar()` untuk batang.',
    duration_min: 4,
    has_quiz: false,
    active: true,
    category_id: 'cat_cv',
    quiz: [],
  },
  {
    slug: 'etika-data-umkm',
    title: 'Etika data untuk UMKM',
    content_md: '## Privasi\n\nAnonimkan data pelanggan sebelum dibagikan.',
    duration_min: 3,
    has_quiz: false,
    active: true,
    category_id: 'cat_umkm',
    quiz: [],
  },
]

const mockCompletions = new Set<string>()

function buildCalendar(): Streak['calendar'] {
  const today = new Date()
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    const iso = d.toISOString().slice(0, 10)
    const active = i % 3 !== 0 && i > 5
    return { date: iso, active }
  })
}

export const mockStreak: Streak = {
  current_streak: 3,
  longest_streak: 8,
  active_today: false,
  weekly_done: 2,
  weekly_goal: 4,
  calendar: buildCalendar(),
}

export function markMicroComplete(slug: string) {
  mockCompletions.add(slug)
}

export function isMicroComplete(slug: string) {
  return mockCompletions.has(slug)
}

export function getMockDailyMicro() {
  const todo = mockMicroStore.filter((m) => !mockCompletions.has(m.slug)).slice(0, 5)
  return {
    items: todo.map((m) => ({
      slug: m.slug,
      title: m.title,
      duration_min: m.duration_min,
      has_quiz: m.has_quiz,
    })),
  }
}

export const mockMicroQuizAnswers: Record<string, { answer_index: number; explanation?: string }[]> = {
  'apa-itu-dataframe': [{ answer_index: 1, explanation: 'Setiap baris umumnya adalah satu observasi.' }],
}
