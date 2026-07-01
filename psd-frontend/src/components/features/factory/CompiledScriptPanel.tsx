'use client'

import { darkPanelClass } from '@/components/common/featureGradients'
import clsx from 'clsx'

type Props = {
  script: string | null | undefined
  language?: string | null
  className?: string
}

export function CompiledScriptPanel({ script, language, className }: Props) {
  if (!script?.trim()) return null

  const label =
    language === 'pyspark' ? 'PySpark yang dijalankan' : language === 'sql' ? 'SQL yang dijalankan' : 'Skrip'

  return (
    <section className={clsx(darkPanelClass, 'overflow-hidden', className)}>
      <div className="border-b border-neutral-200/80 px-4 py-2.5 dark:border-neutral-700">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {label}
        </h3>
        <p className="text-[10px] text-neutral-400">Hanya baca — hasil kompilasi kanvas untuk transparansi & belajar</p>
      </div>
      <pre className="max-h-64 overflow-auto bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-emerald-400/90 dark:bg-neutral-950">
        {script}
      </pre>
    </section>
  )
}
