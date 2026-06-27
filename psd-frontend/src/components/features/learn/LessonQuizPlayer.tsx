'use client'

import { submitQuiz } from '@/lib/api/learn'
import type { CourseLesson, QuizResult } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import clsx from 'clsx'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'

export function LessonQuizPlayer({
  slug,
  lesson,
  onPassed,
}: {
  slug: string
  lesson: CourseLesson
  onPassed?: () => void
}) {
  const questions = lesson.quiz ?? []
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null))
  const [result, setResult] = useState<QuizResult | null>(null)

  const submit = useMutation({
    mutationFn: () => submitQuiz(slug, lesson.id, answers.map((a) => a ?? -1)),
    onSuccess: (data) => {
      setResult(data)
      if (data.passed) onPassed?.()
    },
  })

  const allAnswered = answers.every((a) => a !== null)

  if (result) {
    return (
      <div className="mt-8 space-y-6">
        <div
          className={clsx(
            'rounded-2xl border p-6 text-center',
            result.passed
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30'
              : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30'
          )}
        >
          {result.passed ? (
            <CheckCircleIcon className="mx-auto size-12 text-emerald-500" />
          ) : (
            <XCircleIcon className="mx-auto size-12 text-amber-500" />
          )}
          <p className="mt-3 text-2xl font-bold">{result.score}%</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {result.correct} dari {result.total} benar ·{' '}
            {result.passed ? 'Lulus — lesson ditandai selesai' : 'Belum lulus (minimal 60%)'}
          </p>
          {!result.passed && (
            <Button type="button" outline className="mt-4" onClick={() => { setResult(null); setAnswers(questions.map(() => null)) }}>
              Coba lagi
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Pembahasan</h3>
          {questions.map((q, qi) => {
            const rev = result.review.find((r) => r.id === q.id)
            const chosen = answers[qi]
            const correct = rev?.correct_index
            return (
              <div key={q.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                <p className="font-medium">{qi + 1}. {q.question}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {q.options.map((opt, oi) => (
                    <li
                      key={oi}
                      className={clsx(
                        'rounded-lg px-2 py-1',
                        oi === correct && 'bg-emerald-100 font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
                        oi === chosen && oi !== correct && 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200'
                      )}
                    >
                      {opt}
                      {oi === correct && ' ✓'}
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
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-6">
      {questions.map((q, qi) => (
        <fieldset key={q.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
          <legend className="px-1 text-sm font-semibold">
            {qi + 1}. {q.question}
          </legend>
          <div className="mt-3 space-y-2">
            {q.options.map((opt, oi) => (
              <label
                key={oi}
                className={clsx(
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition',
                  answers[qi] === oi
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                    : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-600'
                )}
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  checked={answers[qi] === oi}
                  onChange={() => {
                    const next = [...answers]
                    next[qi] = oi
                    setAnswers(next)
                  }}
                  className="text-primary-600"
                />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <ButtonPrimary
        type="button"
        onClick={() => submit.mutate()}
        disabled={!allAnswered || submit.isPending}
      >
        {submit.isPending ? 'Menilai…' : 'Kirim jawaban'}
      </ButtonPrimary>
    </div>
  )
}
