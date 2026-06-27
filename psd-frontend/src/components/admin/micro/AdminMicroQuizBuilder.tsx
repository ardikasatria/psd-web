'use client'

import type { QuizQuestionDraft } from '@/components/admin/micro/micro-admin-utils'
import { emptyQuizQuestion } from '@/components/admin/micro/micro-admin-utils'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

type Props = {
  value: QuizQuestionDraft[]
  onChange: (quiz: QuizQuestionDraft[]) => void
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{children}</p>
}

export function AdminMicroQuizBuilder({ value, onChange }: Props) {
  const addQuestion = () => onChange([...value, emptyQuizQuestion(value.length)])

  const updateQuestion = (index: number, patch: Partial<QuizQuestionDraft>) => {
    onChange(value.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  const removeQuestion = (index: number) => onChange(value.filter((_, i) => i !== index))

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const q = value[qIndex]
    if (!q) return
    const options = [...q.options]
    options[oIndex] = text
    updateQuestion(qIndex, { options })
  }

  const addOption = (qIndex: number) => {
    const q = value[qIndex]
    if (!q || q.options.length >= 6) return
    updateQuestion(qIndex, { options: [...q.options, ''] })
  }

  const removeOption = (qIndex: number, oIndex: number) => {
    const q = value[qIndex]
    if (!q || q.options.length <= 2) return
    const options = q.options.filter((_, i) => i !== oIndex)
    const answer_index = Math.min(q.answer_index, options.length - 1)
    updateQuestion(qIndex, { options, answer_index })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Quiz (opsional)</p>
        <FieldHint>
          Tambahkan pertanyaan pilihan ganda. Kosongkan jika materi hanya untuk dibaca — tidak wajib ada quiz.
        </FieldHint>
      </div>

      {value.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 px-4 py-6 text-center dark:border-neutral-600 dark:bg-neutral-900/40">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Belum ada pertanyaan quiz.</p>
          <Button type="button" outline className="mt-3" onClick={addQuestion}>
            <PlusIcon className="size-4" data-slot="icon" aria-hidden />
            Tambah pertanyaan
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {value.map((q, qi) => (
            <div
              key={`${q.id}-${qi}`}
              className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-700 dark:bg-neutral-900/30"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Pertanyaan {qi + 1}</p>
                <Button type="button" plain onClick={() => removeQuestion(qi)} className="!text-red-600">
                  <TrashIcon className="size-4" data-slot="icon" aria-hidden />
                  Hapus
                </Button>
              </div>

              <Textarea
                value={q.question}
                onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                placeholder="Contoh: Apa fungsi utama DataFrame dalam pandas?"
                rows={2}
                className="!rounded-xl"
              />

              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Pilihan jawaban</p>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      checked={q.answer_index === oi}
                      onChange={() => updateQuestion(qi, { answer_index: oi })}
                      className="size-4 shrink-0 accent-primary-600"
                      title="Tandai sebagai jawaban benar"
                    />
                    <Input
                      value={opt}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                      placeholder={`Pilihan ${String.fromCharCode(65 + oi)}`}
                      className="!rounded-xl flex-1"
                    />
                    {q.options.length > 2 && (
                      <Button type="button" plain onClick={() => removeOption(qi, oi)} aria-label="Hapus pilihan">
                        <TrashIcon className="size-4 text-neutral-400" aria-hidden />
                      </Button>
                    )}
                  </div>
                ))}
                {q.options.length < 6 && (
                  <Button type="button" plain onClick={() => addOption(qi)} className="!text-sm">
                    <PlusIcon className="size-4" data-slot="icon" aria-hidden />
                    Tambah pilihan
                  </Button>
                )}
                <FieldHint>Pilih lingkaran di kiri untuk menandai jawaban yang benar.</FieldHint>
              </div>

              <div className="mt-4">
                <p className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">Penjelasan (opsional)</p>
                <Input
                  value={q.explanation}
                  onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                  placeholder="Ditampilkan setelah peserta menjawab — mis. mengapa jawaban itu benar."
                  className="!rounded-xl"
                />
              </div>
            </div>
          ))}

          <Button type="button" outline onClick={addQuestion}>
            <PlusIcon className="size-4" data-slot="icon" aria-hidden />
            Tambah pertanyaan lain
          </Button>
        </div>
      )}
    </div>
  )
}
