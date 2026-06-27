'use client'

import { synthesisGradient } from '@/components/common/featureGradients'
import { pageCtaPanelClass } from '@/components/common/SidebarStatTile'
import { SynthesisConceptSection } from '@/components/features/synthesis/SynthesisConceptSection'
import { SynthesisDtypeGuide } from '@/components/features/synthesis/SynthesisDtypeGuide'
import { SynthesisLearnSidebar } from '@/components/features/synthesis/SynthesisLearnSidebar'
import { SynthesisSkillJourney } from '@/components/features/synthesis/SynthesisSkillJourney'
import { SynthesisWorkshop } from '@/components/features/synthesis/SynthesisWorkshop'
import { FeaturePageShell } from '@/components/features/layout'
import { useAuth } from '@/lib/auth/useAuth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { AcademicCapIcon, SparklesIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { Suspense, useCallback } from 'react'

function SynthesisPageInner() {
  const { isLoggedIn, isLoading: authLoading } = useAuth()

  const scrollToWorkshop = useCallback(() => {
    document.getElementById('synthesis-workshop')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <SynthesisLearnSidebar
          className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72"
          onScrollToWorkshop={scrollToWorkshop}
        />

        <div className="order-1 min-w-0 flex-1 space-y-8 lg:order-2">
          <div className={synthesisGradient.hero}>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                  <AcademicCapIcon className="size-3.5" aria-hidden />
                  Ruang belajar data
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Data Sintesis
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Pahami apa itu data sintesis, latih skill desain skema, dan praktik langsung dengan generator
                  berlocale Indonesia — dari deskripsi masalah hingga dataset siap modeling.
                </p>
              </div>
              {!authLoading && (
                isLoggedIn ? (
                  <ButtonPrimary type="button" onClick={scrollToWorkshop} className="shrink-0">
                    <SparklesIcon className="size-4" aria-hidden />
                    Mulai praktik
                  </ButtonPrimary>
                ) : (
                  <ButtonPrimary href="/login?next=/synthesis" className="shrink-0">
                    Masuk untuk praktik
                  </ButtonPrimary>
                )
              )}
            </div>
            <div
              className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-primary-400/10 blur-3xl dark:bg-primary-600/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 start-1/3 size-48 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-600/10"
              aria-hidden
            />
          </div>

          <SynthesisConceptSection />

          <SynthesisSkillJourney />

          <SynthesisDtypeGuide />

          {!authLoading && !isLoggedIn && (
            <div className={`${pageCtaPanelClass} py-10`}>
              <SparklesIcon className="mx-auto size-10 text-primary-500" aria-hidden />
              <p className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Siap latihan hands-on?
              </p>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Masuk untuk membuat dataset sintesis, melihat spesifikasi AI, dan menerbitkan hasil ke portofolio.
              </p>
              <ButtonPrimary href="/login?next=/synthesis" className="mt-6">
                Masuk & mulai workshop
              </ButtonPrimary>
            </div>
          )}

          {!authLoading && isLoggedIn && <SynthesisWorkshop />}

          {!authLoading && isLoggedIn && (
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
              Setelah mahir, lanjut ke{' '}
              <Link href="/idea-rooms" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                Ruang Ide
              </Link>{' '}
              atau{' '}
              <Link href="/competitions" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                kompetisi
              </Link>{' '}
              dengan data sintesis tim.
            </p>
          )}
        </div>
      </div>
    </FeaturePageShell>
  )
}

export function SynthesisPage() {
  return (
    <Suspense>
      <SynthesisPageInner />
    </Suspense>
  )
}
