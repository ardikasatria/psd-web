'use client'

import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentTextIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline'
import { synthesisGradient } from '@/components/common/featureGradients'
import clsx from 'clsx'

const STEPS = [
  {
    icon: ChatBubbleBottomCenterTextIcon,
    title: 'Deskripsikan',
    desc: 'Tulis masalah dalam bahasa natural',
    accent: 'from-primary-400 to-primary-500',
  },
  {
    icon: DocumentTextIcon,
    title: 'Pelajari spec',
    desc: 'AI merancang kolom & tipe data',
    accent: 'from-sky-400 to-indigo-500',
  },
  {
    icon: AdjustmentsHorizontalIcon,
    title: 'Sesuaikan',
    desc: 'Edit dtype & parameter JSON',
    accent: 'from-indigo-400 to-violet-500',
  },
  {
    icon: RocketLaunchIcon,
    title: 'Generate',
    desc: 'Pratinjau & unduh CSV',
    accent: 'from-violet-400 to-purple-500',
  },
  {
    icon: ArrowDownTrayIcon,
    title: 'Terbitkan',
    desc: 'Jadi dataset portofolio',
    accent: 'from-amber-400 to-primary-500',
  },
] as const

export function SynthesisSkillJourney() {
  return (
    <section className={synthesisGradient.conceptRow}>
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Alur belajar praktik</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Setiap langkah melatih skill berbeda — dari komunikasi kebutuhan data hingga desain skema.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-5">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={step.title} className="relative flex flex-col items-center text-center">
              {i < STEPS.length - 1 && (
                <div
                  className="pointer-events-none absolute start-[calc(50%+1.75rem)] top-6 hidden h-0.5 w-[calc(100%-3.5rem)] bg-gradient-to-r from-primary-200 to-sky-200 dark:from-primary-800 dark:to-indigo-800 sm:block"
                  aria-hidden
                />
              )}
              <div
                className={clsx(
                  'flex size-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                  step.accent,
                )}
              >
                <Icon className="size-5" aria-hidden />
              </div>
              <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{step.title}</p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{step.desc}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
