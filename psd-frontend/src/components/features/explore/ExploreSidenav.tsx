'use client'

import { exploreSections } from '@/data/explore-sections'
import clsx from 'clsx'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Props {
  activeId: string
  onNavigate: (id: string) => void
  variant?: 'sidebar' | 'rail'
}

export function ExploreSidenav({ activeId, onNavigate, variant = 'sidebar' }: Props) {
  const isRail = variant === 'rail'

  return (
    <nav
      className={clsx(
        isRail
          ? 'flex gap-2 overflow-x-auto pb-1'
          : 'space-y-1',
      )}
      aria-label="Navigasi explore"
    >
      {exploreSections.map((section) => {
        const Icon = section.icon
        const active = activeId === section.id
        const baseClass = clsx(
          'flex items-center gap-2.5 rounded-xl text-sm font-medium transition-colors',
          isRail ? 'shrink-0 px-3.5 py-2' : 'w-full px-3 py-2.5',
          active
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100',
        )

        if (isRail) {
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onNavigate(section.id)}
              className={baseClass}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {section.label}
            </button>
          )
        }

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onNavigate(section.id)}
            className={baseClass}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className="flex-1 text-start">{section.label}</span>
            {section.seeAllHref && (
              <Link
                href={section.seeAllHref}
                onClick={(e) => e.stopPropagation()}
                className={clsx(
                  'rounded-lg px-2 py-0.5 text-xs transition-colors',
                  active
                    ? 'bg-white/20 text-white hover:bg-white/30'
                    : 'text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200',
                )}
              >
                Semua
              </Link>
            )}
          </button>
        )
      })}
    </nav>
  )
}

export function useExploreScrollSpy(sectionIds: string[]) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? '')

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null)

    if (!elements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.25, 0.5, 1] },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sectionIds])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return

    const headerOffset = 80
    const mobileRailOffset = window.matchMedia('(max-width: 1023px)').matches ? 56 : 12
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset - mobileRailOffset

    window.scrollTo({ top, behavior: 'smooth' })
    setActiveId(id)
  }

  return { activeId, scrollTo }
}
