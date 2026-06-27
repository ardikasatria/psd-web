'use client'

import {
  ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { conceptGradientRow } from '@/components/common/featureGradients'
import clsx from 'clsx'

const PHASES = [
  {
    icon: LightBulbIcon,
    title: 'Ajukan',
    desc: 'Ungkap masalah & ajak tim',
    accent: 'from-primary-400 to-primary-500',
  },
  {
    icon: ChatBubbleLeftEllipsisIcon,
    title: 'Framing',
    desc: 'Rumuskan bersama',
    accent: 'from-sky-400 to-indigo-500',
  },
  {
    icon: RocketLaunchIcon,
    title: 'Solusi',
    desc: 'Data & notebook tim',
    accent: 'from-indigo-400 to-violet-500',
  },
  {
    icon: CheckCircleIcon,
    title: 'Selesai',
    desc: 'Publikasi aset',
    accent: 'from-emerald-400 to-teal-500',
  },
  {
    icon: TrophyIcon,
    title: 'Tantangan',
    desc: 'Kompetisi komunitas',
    accent: 'from-amber-400 to-orange-500',
  },
] as const

export function RoomCollaborationJourney() {
  return (
    <section className={conceptGradientRow.ideaRoom}>
      <div className="mb-6 text-center sm:mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Dari ide ke dampak bersama</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Setiap ruang melewati fase kolaboratif — Anda bisa masuk kapan saja sesuai energi dan keahlian.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-5">
        {PHASES.map((phase, i) => {
          const Icon = phase.icon
          return (
            <div key={phase.title} className="relative flex flex-col items-center text-center">
              {i < PHASES.length - 1 && (
                <div
                  className="pointer-events-none absolute start-[calc(50%+1.75rem)] top-6 hidden h-0.5 w-[calc(100%-3.5rem)] bg-gradient-to-r from-primary-200 to-sky-200 dark:from-primary-800 dark:to-indigo-800 sm:block"
                  aria-hidden
                />
              )}
              <div
                className={clsx(
                  'flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm',
                  phase.accent,
                )}
              >
                <Icon className="size-6" aria-hidden />
              </div>
              <p className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{phase.title}</p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{phase.desc}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
