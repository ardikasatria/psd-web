'use client'

import {
  canSubmitCourseReview,
  courseStatusColor,
  courseStatusLabel,
  isCourseEditorLocked,
} from '@/components/features/learn/courseStatus'
import { formatDuration } from '@/components/features/learn/learnUtils'
import { ConfirmDialog } from '@/components/admin/AdminShared'
import {
  calcTotalMinutes,
  emptyLesson,
  emptyModule,
  emptyQuizQuestion,
  newQuizQuestionId,
  normalizeModules,
  type ModuleDraft,
} from '@/lib/course/builder'
import { getCourse, submitCourseReview, updateCourse, uploadMaterial } from '@/lib/api/learn'
import type { CourseLesson, CourseStatus, QuizQuestion } from '@/types/api'
import { formatFileSize } from '@/lib/utils/format'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  DocumentArrowUpIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const LESSON_TYPES: CourseLesson['type'][] = ['reading', 'video', 'quiz']
const TYPE_LABELS = { reading: 'Bacaan', video: 'Video', quiz: 'Quiz' }

export function CourseBuilderPage({ slug }: { slug: string }) {
  const router = useRouter()
  const qc = useQueryClient()
  const course = useQuery({ queryKey: ['course', slug], queryFn: () => getCourse(slug) })

  const [title, setTitle] = useState('')
  const [level, setLevel] = useState('pemula')
  const [description, setDescription] = useState('')
  const [requirementsMd, setRequirementsMd] = useState('')
  const [modules, setModules] = useState<ModuleDraft[]>([emptyModule()])
  const [activeModule, setActiveModule] = useState(0)
  const [activeLesson, setActiveLesson] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [accessType, setAccessType] = useState<'lifetime' | 'limited'>('lifetime')
  const [accessDays, setAccessDays] = useState('30')

  useEffect(() => {
    if (!course.data) return
    const c = course.data
    setTitle(c.title)
    setLevel(c.level)
    setDescription(c.description)
    setRequirementsMd(c.requirements_md ?? '')
    setAccessType(c.access_type ?? 'lifetime')
    setAccessDays(String(c.access_days ?? 30))
    setModules(
      c.modules.length
        ? c.modules.map((m) => ({
            title: m.title,
            lessons: m.lessons.map((l) => ({
              ...l,
              type: l.type ?? 'reading',
              duration_min: l.duration_min ?? 0,
              materials: l.materials ?? [],
              quiz: l.quiz ?? (l.type === 'quiz' ? [emptyQuizQuestion()] : undefined),
            })),
          }))
        : [emptyModule()]
    )
    setDirty(false)
  }, [course.data])

  const status = course.data?.status as CourseStatus | undefined
  const locked = isCourseEditorLocked(status)
  const totalMin = useMemo(() => calcTotalMinutes(modules), [modules])
  const currentModule = modules[activeModule]
  const currentLesson = currentModule?.lessons[activeLesson]

  const markDirty = () => setDirty(true)

  const save = useMutation({
    mutationFn: () =>
      updateCourse(slug, {
        title,
        level,
        description,
        requirements_md: requirementsMd || null,
        access_type: accessType,
        access_days: accessType === 'limited' ? Number(accessDays) || 30 : null,
        modules: normalizeModules(modules),
      }),
    onSuccess: () => {
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['course', slug] })
      qc.invalidateQueries({ queryKey: ['authored-courses'] })
    },
  })

  const submitReview = useMutation({
    mutationFn: () => submitCourseReview(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', slug] })
      qc.invalidateQueries({ queryKey: ['authored-courses'] })
      router.push('/studio')
    },
  })

  const upload = useMutation({
    mutationFn: (file: File) => uploadMaterial(slug, file),
    onSuccess: (mat) => {
      if (!currentLesson) return
      const next = [...modules]
      const lesson = { ...next[activeModule].lessons[activeLesson] }
      lesson.materials = [...(lesson.materials ?? []), mat]
      next[activeModule].lessons[activeLesson] = lesson
      setModules(next)
      markDirty()
    },
  })

  const updateLesson = (patch: Partial<CourseLesson>) => {
    const next = [...modules]
    next[activeModule].lessons[activeLesson] = { ...next[activeModule].lessons[activeLesson], ...patch }
    setModules(next)
    markDirty()
  }

  const setLessonType = (type: CourseLesson['type']) => {
    const base = { ...currentLesson!, type }
    if (type === 'reading') {
      updateLesson({ ...base, content_md: base.content_md ?? '', video_url: null, quiz: undefined })
    } else if (type === 'video') {
      updateLesson({ ...base, video_url: base.video_url ?? '', content_md: null, quiz: undefined })
    } else {
      updateLesson({ ...base, quiz: base.quiz?.length ? base.quiz : [emptyQuizQuestion()], content_md: null, video_url: null })
    }
  }

  if (course.isLoading) {
    return <div className="py-20 text-center text-neutral-500">Memuat course…</div>
  }

  if (course.isError || !course.data) {
    return (
      <div className="py-20 text-center">
        <p className="text-neutral-500">Course tidak ditemukan.</p>
        <ButtonPrimary href="/studio" className="mt-4">
          Kembali ke Studio
        </ButtonPrimary>
      </div>
    )
  }

  return (
    <div className="pb-20">
      {/* Sticky toolbar */}
      <div className="sticky top-16 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/studio"
              className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              <ArrowLeftIcon className="size-4" />
              Studio
            </Link>
            <span className="hidden text-neutral-300 sm:inline">/</span>
            <h1 className="truncate text-sm font-semibold sm:text-base">{title || slug}</h1>
            {status && (
              <Badge color={courseStatusColor[status]} className="shrink-0">
                {courseStatusLabel[status]}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500">{formatDuration(totalMin)}</span>
            {!locked && (
              <Button outline onClick={() => save.mutate()} disabled={save.isPending || !dirty}>
                {save.isPending ? 'Menyimpan…' : dirty ? 'Simpan' : 'Tersimpan'}
              </Button>
            )}
            {!locked && canSubmitCourseReview(status) && (
              <ConfirmDialog
                label="Ajukan tinjauan"
                confirm="Ajukan course untuk ditinjau tim PSD? Course akan terkunci hingga selesai."
                onConfirm={() => submitReview.mutate()}
              />
            )}
            <Link
              href={`/studio/courses/${slug}/learners`}
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:text-neutral-300 dark:ring-neutral-600 dark:hover:bg-neutral-800"
            >
              Pembelajar
            </Link>
          </div>
        </div>
      </div>

      <div className="container py-6 lg:py-8">
        {locked && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            Course sedang ditinjau — builder dalam mode baca saja.
          </div>
        )}

        {/* Metadata */}
        <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
          <h2 className="text-lg font-semibold">Informasi course</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Input
              placeholder="Judul course"
              value={title}
              onChange={(e) => { setTitle(e.target.value); markDirty() }}
              disabled={locked}
              className="!rounded-xl lg:col-span-2"
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Level</label>
              <select
                value={level}
                onChange={(e) => { setLevel(e.target.value); markDirty() }}
                disabled={locked}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
              >
                <option value="pemula">Pemula</option>
                <option value="menengah">Menengah</option>
                <option value="mahir">Mahir</option>
              </select>
            </div>
            <div className="flex items-end">
              <p className="text-sm text-neutral-500">
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{modules.flatMap((m) => m.lessons).length}</span> lesson ·{' '}
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{formatDuration(totalMin)}</span>
              </p>
            </div>
            <Textarea
              placeholder="Deskripsi course"
              value={description}
              onChange={(e) => { setDescription(e.target.value); markDirty() }}
              rows={3}
              disabled={locked}
              className="!rounded-xl lg:col-span-2"
            />
            <Textarea
              placeholder="Syarat / prasyarat (markdown)"
              value={requirementsMd}
              onChange={(e) => { setRequirementsMd(e.target.value); markDirty() }}
              rows={3}
              disabled={locked}
              className="!rounded-xl lg:col-span-2"
            />
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
          <h2 className="text-lg font-semibold">Akses pembelajar</h2>
          <p className="mt-1 text-sm text-neutral-500">Atur masa berlaku akses setelah enrol.</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-neutral-500">Tipe akses</label>
              <select
                value={accessType}
                onChange={(e) => { setAccessType(e.target.value as 'lifetime' | 'limited'); markDirty() }}
                disabled={locked}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
              >
                <option value="lifetime">Selamanya (lifetime)</option>
                <option value="limited">Terbatas waktu</option>
              </select>
            </div>
            {accessType === 'limited' && (
              <div className="sm:w-40">
                <label className="mb-1 block text-xs font-medium text-neutral-500">Jumlah hari</label>
                <Input
                  type="number"
                  min={1}
                  value={accessDays}
                  onChange={(e) => { setAccessDays(e.target.value); markDirty() }}
                  disabled={locked}
                  className="!rounded-xl"
                />
              </div>
            )}
          </div>
        </section>

        {/* Builder grid */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr] xl:grid-cols-[minmax(0,320px)_1fr]">
          {/* Outline */}
          <aside className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Struktur</h2>
              {!locked && (
                <Button
                  type="button"
                  outline
                  className="!px-2 !py-1 text-xs"
                  onClick={() => {
                    setModules([...modules, emptyModule()])
                    setActiveModule(modules.length)
                    setActiveLesson(0)
                    markDirty()
                  }}
                >
                  <PlusIcon className="size-3.5" /> Topik
                </Button>
              )}
            </div>
            <div className="mt-3 space-y-4">
              {modules.map((mod, mi) => (
                <div key={mi} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-neutral-100 dark:bg-neutral-800 dark:ring-neutral-700">
                  <div className="flex items-start gap-2">
                    <Input
                      value={mod.title}
                      onChange={(e) => {
                        const next = [...modules]
                        next[mi] = { ...mod, title: e.target.value }
                        setModules(next)
                        markDirty()
                      }}
                      disabled={locked}
                      className="!rounded-lg flex-1 text-sm font-medium"
                      placeholder="Judul topik"
                    />
                    {!locked && modules.length > 1 && (
                      <button type="button" onClick={() => {
                        const next = modules.filter((_, i) => i !== mi)
                        setModules(next)
                        setActiveModule(Math.max(0, mi - 1))
                        markDirty()
                      }} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-700">
                        <TrashIcon className="size-4" />
                      </button>
                    )}
                  </div>
                  <ul className="mt-2 space-y-0.5">
                    {mod.lessons.map((l, li) => (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => { setActiveModule(mi); setActiveLesson(li) }}
                          className={clsx(
                            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition',
                            activeModule === mi && activeLesson === li
                              ? 'bg-primary-100 font-medium text-primary-800 dark:bg-primary-950/50 dark:text-primary-200'
                              : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-700/50'
                          )}
                        >
                          <span className="size-1.5 shrink-0 rounded-full bg-primary-500" />
                          <span className="min-w-0 flex-1 truncate">{l.title || 'Lesson tanpa judul'}</span>
                          <span className="text-[10px] uppercase text-neutral-400">{TYPE_LABELS[l.type ?? 'reading']}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {!locked && (
                    <Button
                      type="button"
                      outline
                      className="mt-2 w-full !py-1.5 text-xs"
                      onClick={() => {
                        const next = [...modules]
                        next[mi].lessons.push(emptyLesson())
                        setModules(next)
                        setActiveModule(mi)
                        setActiveLesson(next[mi].lessons.length - 1)
                        markDirty()
                      }}
                    >
                      <PlusIcon className="size-3.5" /> Lesson
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* Lesson editor */}
          <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
            {!currentLesson ? (
              <p className="py-12 text-center text-neutral-500">Pilih lesson untuk mengedit.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">Editor lesson</h2>
                  {!locked && currentModule.lessons.length > 1 && (
                    <div className="flex gap-1">
                      <Button type="button" outline className="!px-2" disabled={activeLesson === 0} onClick={() => {
                        const next = [...modules]
                        const lessons = [...next[activeModule].lessons]
                        ;[lessons[activeLesson - 1], lessons[activeLesson]] = [lessons[activeLesson], lessons[activeLesson - 1]]
                        next[activeModule].lessons = lessons
                        setModules(next)
                        setActiveLesson(activeLesson - 1)
                        markDirty()
                      }}>
                        <ArrowUpIcon className="size-4" />
                      </Button>
                      <Button type="button" outline className="!px-2" disabled={activeLesson >= currentModule.lessons.length - 1} onClick={() => {
                        const next = [...modules]
                        const lessons = [...next[activeModule].lessons]
                        ;[lessons[activeLesson], lessons[activeLesson + 1]] = [lessons[activeLesson + 1], lessons[activeLesson]]
                        next[activeModule].lessons = lessons
                        setModules(next)
                        setActiveLesson(activeLesson + 1)
                        markDirty()
                      }}>
                        <ArrowDownIcon className="size-4" />
                      </Button>
                      <Button type="button" outline className="!px-2" onClick={() => {
                        const next = [...modules]
                        next[activeModule].lessons = next[activeModule].lessons.filter((_, i) => i !== activeLesson)
                        setModules(next)
                        setActiveLesson(Math.max(0, activeLesson - 1))
                        markDirty()
                      }}>
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Input
                    placeholder="Judul lesson"
                    value={currentLesson.title}
                    onChange={(e) => updateLesson({ title: e.target.value })}
                    disabled={locked}
                    className="!rounded-xl sm:col-span-2"
                  />
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-xs font-medium text-neutral-500">Tipe lesson</label>
                    <div className="flex flex-wrap gap-2">
                      {LESSON_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          disabled={locked}
                          onClick={() => setLessonType(t)}
                          className={clsx(
                            'rounded-full px-4 py-1.5 text-sm font-medium transition',
                            (currentLesson.type ?? 'reading') === t
                              ? 'bg-primary-600 text-white'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                          )}
                        >
                          {TYPE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input
                    type="number"
                    placeholder="Durasi (menit)"
                    value={currentLesson.duration_min ?? 0}
                    onChange={(e) => updateLesson({ duration_min: Number(e.target.value) })}
                    disabled={locked}
                    className="!rounded-xl"
                  />
                </div>

                {(currentLesson.type ?? 'reading') === 'reading' && (
                  <Textarea
                    placeholder="Konten bacaan (markdown)"
                    value={currentLesson.content_md ?? ''}
                    onChange={(e) => updateLesson({ content_md: e.target.value })}
                    rows={10}
                    disabled={locked}
                    className="mt-4 !rounded-xl font-mono text-sm"
                  />
                )}

                {(currentLesson.type ?? 'reading') === 'video' && (
                  <Input
                    placeholder="URL video (YouTube, Vimeo, atau mp4)"
                    value={currentLesson.video_url ?? ''}
                    onChange={(e) => updateLesson({ video_url: e.target.value })}
                    disabled={locked}
                    className="mt-4 !rounded-xl"
                  />
                )}

                {(currentLesson.type ?? 'reading') === 'quiz' && (
                  <QuizEditor
                    questions={currentLesson.quiz ?? []}
                    locked={locked}
                    onChange={(quiz) => updateLesson({ quiz })}
                  />
                )}

                {/* Materials */}
                <div className="mt-8 border-t border-neutral-100 pt-6 dark:border-neutral-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">Materi unduhan</h3>
                    {!locked && (
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200">
                        <DocumentArrowUpIcon className="size-4" />
                        {upload.isPending ? 'Mengunggah…' : 'Unggah file'}
                        <input
                          type="file"
                          className="sr-only"
                          disabled={upload.isPending}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) upload.mutate(f)
                            e.target.value = ''
                          }}
                        />
                      </label>
                    )}
                  </div>
                  {(currentLesson.materials ?? []).length === 0 ? (
                    <p className="mt-3 text-sm text-neutral-500">Belum ada materi dilampirkan.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {(currentLesson.materials ?? []).map((mat, idx) => (
                        <li key={`${mat.url}-${idx}`} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-800/60">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{mat.name}</p>
                            <p className="text-xs text-neutral-500">{formatFileSize(mat.size_bytes)}</p>
                          </div>
                          {!locked && (
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:underline"
                              onClick={() => {
                                const mats = (currentLesson.materials ?? []).filter((_, i) => i !== idx)
                                updateLesson({ materials: mats })
                              }}
                            >
                              Hapus
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function QuizEditor({
  questions,
  locked,
  onChange,
}: {
  questions: QuizQuestion[]
  locked?: boolean
  onChange: (q: QuizQuestion[]) => void
}) {
  const updateQ = (idx: number, patch: Partial<QuizQuestion>) => {
    const next = [...questions]
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const next = [...questions]
    const opts = [...next[qIdx].options]
    opts[oIdx] = value
    next[qIdx] = { ...next[qIdx], options: opts }
    onChange(next)
  }

  return (
    <div className="mt-4 space-y-4">
      {questions.map((q, qi) => (
        <div key={q.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-neutral-500">Pertanyaan {qi + 1}</p>
            {!locked && questions.length > 1 && (
              <button type="button" className="text-xs text-red-600" onClick={() => onChange(questions.filter((_, i) => i !== qi))}>
                Hapus
              </button>
            )}
          </div>
          <Input
            placeholder="Teks pertanyaan"
            value={q.question}
            onChange={(e) => updateQ(qi, { question: e.target.value })}
            disabled={locked}
            className="mt-2 !rounded-xl"
          />
          <div className="mt-3 space-y-2">
            {q.options.map((opt, oi) => (
              <label key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`answer-${q.id}`}
                  checked={q.answer_index === oi}
                  disabled={locked}
                  onChange={() => updateQ(qi, { answer_index: oi })}
                  className="text-primary-600"
                />
                <Input
                  placeholder={`Opsi ${oi + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                  disabled={locked}
                  className="!rounded-xl flex-1"
                />
              </label>
            ))}
          </div>
          <Textarea
            placeholder="Penjelasan (opsional, ditampilkan setelah submit)"
            value={q.explanation ?? ''}
            onChange={(e) => updateQ(qi, { explanation: e.target.value })}
            rows={2}
            disabled={locked}
            className="mt-3 !rounded-xl text-sm"
          />
        </div>
      ))}
      {!locked && (
        <Button
          type="button"
          outline
          onClick={() => onChange([...questions, { ...emptyQuizQuestion(), id: newQuizQuestionId() }])}
        >
          <PlusIcon className="size-4" /> Tambah pertanyaan
        </Button>
      )}
    </div>
  )
}
