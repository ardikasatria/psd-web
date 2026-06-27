'use client'

import { QUEST_STEP_LABELS, questStepHref } from '@/lib/quests/utils'
import type { QuestStep } from '@/types/api'
import { Button } from '@/shared/Button'
import clsx from 'clsx'
import { ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import { MinusCircleIcon } from '@heroicons/react/24/outline'

export function QuestStepList({ steps }: { steps: QuestStep[] }) {
  return (
    <ol className="relative space-y-0">
      {steps.map((step, i) => {
        const done = step.done
        const isLast = i === steps.length - 1
        const href = questStepHref(step)
        const typeLabel = QUEST_STEP_LABELS[step.type] ?? step.type

        return (
          <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast && (
              <span
                className={clsx(
                  'absolute start-[15px] top-8 h-[calc(100%-1rem)] w-0.5',
                  done ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-neutral-200 dark:bg-neutral-700',
                )}
                aria-hidden
              />
            )}

            <div className="relative z-10 shrink-0">
              {done ? (
                <CheckCircleIcon className="size-8 text-emerald-500" />
              ) : (
                <MinusCircleIcon className="size-8 text-neutral-300 dark:text-neutral-600" />
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className={clsx('font-semibold', done ? 'text-neutral-500 line-through dark:text-neutral-400' : 'text-neutral-900 dark:text-neutral-100')}>
                  {step.title}
                </h4>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                  {typeLabel}
                </span>
              </div>
              {step.description && (
                <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{step.description}</p>
              )}
              {!done && (
                <Button href={href} outline className="mt-3 !text-sm">
                  Kerjakan langkah ini
                  <ArrowRightIcon className="size-3.5" data-slot="icon" />
                </Button>
              )}
              {done && (
                <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">Selesai</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
