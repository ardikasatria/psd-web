'use client'

import { getNodeHelp } from '@/lib/factory/nodeHelp'
import type { PipelineNode } from '@/types/api'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

type Props = {
  kind: PipelineNode['type']
  op?: PipelineNode['op']
  className?: string
}

export function NodeHelpPanel({ kind, op, className }: Props) {
  const help = getNodeHelp(kind, op)

  return (
    <div
      className={clsx(
        'rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-950/25',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <InformationCircleIcon className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">{help.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800/90 dark:text-amber-300/90">{help.summary}</p>
          </div>
          <ol className="list-decimal space-y-1 ps-4 text-[11px] leading-relaxed text-amber-900/80 dark:text-amber-200/80">
            {help.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {help.dataHint && (
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
              <span className="font-semibold">Data: </span>
              {help.dataHint}
            </p>
          )}
          {help.codeHint && (
            <pre className="overflow-x-auto rounded-lg bg-neutral-900/90 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-emerald-400/90">
              {help.codeHint}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
