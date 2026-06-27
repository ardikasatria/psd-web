'use client'

import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageShell } from '@/components/features/layout'
import { completeMicro, getDailyMicro, getMicro } from '@/lib/api/micro'
import type { MicroCompleteResult, MicroLesson, MicroQuizQuestion, MicroSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid'

export function MicroPlayerContent({ slug }: { slug: string }) {
  const qc = useQueryClient()
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [result, setResult] = useState<MicroCompleteResult | null>(null)
  const [done, setDone] = useState(false)

  const lesson = useQuery({
    queryKey: ['micro', slug],
    queryFn: (): Promise<MicroLesson> => getMicro(slug),
  })

  const daily = useQuery({
    queryKey: ['micro', 'daily'],
    queryFn: getDailyMicro,
    enabled: done,
  })

  const micro = lesson.data
  const questions = micro?.quiz ?? []

  useEffect(() => {
    if (micro?.has_quiz) {
      setAnswers(micro.quiz.map(() => null))
    }
  }, [micro?.slug, micro?.has_quiz, micro?.quiz])

  const complete = useMutation<MicroCompleteResult, Error, number[] | undefined>({
    mutationFn: async (payload) => {
      if (payload && payload.length > 0) return completeMicro(slug, payload)
      return completeMicro(slug)
    },
    onSuccess: (data) => {
      setResult(data)
      setDone(true)
      qc.invalidateQueries({ queryKey: ['me', 'streak'] })
      qc.invalidateQueries({ queryKey: ['micro', 'daily'] })
      qc.invalidateQueries({ queryKey: ['me', 'gamification'] })
    },
  })

  const allAnswered = questions.length === 0 || answers.every((a) => a !== null)
  const reduceMotion =
    typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion')

  const nextSlug = daily.data?.items.find((i: MicroSummary) => i.slug !== slug)?.slug

  if (done && result) {
    return (
      <DetailPageShell>
        <div
          className={clsx(
            'mx-auto max-w-2xl rounded-3xl border p-8 text-center',
            !reduceMotion && 'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500',
            'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-neutral-900',
          )}
        >
          <CheckSolid className="mx-auto size-14 text-emerald-500" />
          <h1 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-50">Micro-lesson selesai</h1>
          {result.first_completion && (
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">+1 reputasi untuk konsistensi belajar</p>
          )}
          {result.quiz && (
            <p className="mt-3 text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              Skor quiz: {result.quiz.score}% ({result.quiz.correct}/{result.quiz.total})
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {nextSlug ? (
              <ButtonPrimary href={`/micro/${nextSlug}`} className="group">
                Micro berikutnya
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" data-slot="icon" />
              </ButtonPrimary>
            ) : (
              <ButtonPrimary href="/dashboard">Kembali ke dasbor</ButtonPrimary>
            )}
            <Button href="/me/streak" outline>
              Lihat streak
            </Button>
          </div>
        </div>

        {result.quiz && micro && (
          <div className="mx-auto mt-8 max-w-2xl space-y-4">
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Pembahasan</h2>
            {questions.map((q: MicroQuizQuestion, qi: number) => {
              const rev = result.quiz!.review.find((r) => r.id === q.id)
              const chosen = answers[qi]
              const correct = rev?.correct_index
              return (
                <div key={q.id} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
                  <p className="font-medium">{qi + 1}. {q.question}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {q.options.map((opt: string, oi: number) => (
                      <li
                        key={oi}
                        className={clsx(
                          'rounded-lg px-2 py-1',
                          oi === correct && 'bg-emerald-100 font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
                          oi === chosen && oi !== correct && 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200',
                        )}
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                  {rev?.explanation && (
                    <p className="mt-2 text-sm text-neutral-500">{rev.explanation}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DetailPageShell>
    )
  }

  return (
    <DetailPageShell>
      <Link href="/dashboard" className="text-sm font-medium text-neutral-500 hover:text-primary-600">
        ← Dasbor
      </Link>

      <QueryState isLoading={lesson.isLoading} isError={lesson.isError} error={lesson.error}>
        {micro && (
          <article className="mx-auto mt-6 max-w-2xl">
            <div className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-800">
              <div className="bg-gradient-to-br from-primary-500 via-primary-500 to-blue-600 px-6 py-8 text-white sm:px-8">
                <div className="flex items-center gap-2 text-sm font-medium text-white/85">
                  <AcademicCapIcon className="size-4" />
                  Micro-lesson
                </div>
                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{micro.title}</h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-white/80">
                  <ClockIcon className="size-4" />
                  ~{micro.duration_min} menit
                  {micro.has_quiz && (
                    <Badge className="!bg-white/20 !text-white ring-0">
                      <PuzzlePieceIcon className="size-3.5" />
                      Quiz singkat
                    </Badge>
                  )}
                </p>
              </div>

              <div className="p-6 sm:p-8">
                <SimpleMarkdown content={micro.content_md} className="text-base" />

                {micro.has_quiz ? (
                  <div className="mt-8 space-y-6 border-t border-neutral-200 pt-8 dark:border-neutral-700">
                    <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Quiz singkat</h2>
                    {questions.map((q: MicroQuizQuestion, qi: number) => (
                      <fieldset key={q.id} className="space-y-2">
                        <legend className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {qi + 1}. {q.question}
                        </legend>
                        <div className="space-y-2">
                          {q.options.map((opt: string, oi: number) => (
                            <label
                              key={oi}
                              className={clsx(
                                'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors',
                                answers[qi] === oi
                                  ? 'border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-950/30'
                                  : 'border-neutral-200 hover:border-primary-200 dark:border-neutral-700',
                              )}
                            >
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                className="text-primary-600"
                                checked={answers[qi] === oi}
                                onChange={() => {
                                  const next = [...answers]
                                  next[qi] = oi
                                  setAnswers(next)
                                }}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                    <ButtonPrimary
                      disabled={!allAnswered || complete.isPending}
                      onClick={() => complete.mutate(answers.map((a) => a ?? -1))}
                    >
                      {complete.isPending ? 'Mengirim…' : 'Kirim & selesai'}
                    </ButtonPrimary>
                  </div>
                ) : (
                  <div className="mt-8 border-t border-neutral-200 pt-8 dark:border-neutral-700">
                    <ButtonPrimary
                      disabled={complete.isPending}
                      onClick={() => complete.mutate(undefined)}
                      className="group"
                    >
                      <CheckCircleIcon className="size-5" data-slot="icon" />
                      {complete.isPending ? 'Menyimpan…' : 'Tandai selesai'}
                    </ButtonPrimary>
                  </div>
                )}
              </div>
            </div>
          </article>
        )}
      </QueryState>
    </DetailPageShell>
  )
}
