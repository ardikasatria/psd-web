'use client'

import { completeOnboarding, getOnboarding } from '@/lib/api/me'
import { resendVerification } from '@/lib/api/auth'
import { useAuth } from '@/lib/auth/useAuth'
import { Button } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

const ITEMS = [
  {
    key: 'profile_completed' as const,
    label: 'Lengkapi profil',
    href: '/settings/profile',
    action: 'Buka pengaturan',
  },
  {
    key: 'email_verified' as const,
    label: 'Verifikasi email',
    href: '/settings/security',
    action: 'Ke keamanan',
  },
  {
    key: 'interests_selected' as const,
    label: 'Pilih minat',
    href: '/settings/profile',
    action: 'Pilih minat',
  },
  {
    key: 'has_asset' as const,
    label: 'Buat aset pertama',
    href: '/projects/new',
    action: 'Buat proyek',
  },
  {
    key: 'joined_competition' as const,
    label: 'Ikuti kompetisi',
    href: '/competitions',
    action: 'Jelajahi kompetisi',
  },
  {
    key: 'joined_discussion' as const,
    label: 'Gabung diskusi',
    href: '/forum',
    action: 'Buka forum',
  },
]

export function OnboardingChecklist() {
  const { user, isLoading: authLoading } = useAuth()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['onboarding'],
    queryFn: getOnboarding,
    enabled: !!user,
  })

  const hide = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const resend = useMutation({
    mutationFn: resendVerification,
  })

  if (authLoading || isLoading || !data) return null

  const doneCount = ITEMS.filter((item) => data.checklist[item.key]).length
  const allDone = doneCount === ITEMS.length

  if (data.onboarded) return null

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
      <header className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-700">
        <div>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Mulai di sini</h3>
          <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            {doneCount}/{ITEMS.length} langkah selesai — selesaikan untuk memaksimalkan PSD.
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 sm:w-40 dark:bg-neutral-700">
          <div
            className="h-full rounded-full bg-primary-600 transition-all motion-reduce:transition-none"
            style={{ width: `${(doneCount / ITEMS.length) * 100}%` }}
          />
        </div>
      </header>

      <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
        {ITEMS.map((item) => {
          const done = data.checklist[item.key]
          return (
            <li
              key={item.key}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <CheckCircleIcon
                  className={clsx('size-5 shrink-0', done ? 'text-green-600' : 'text-neutral-300 dark:text-neutral-600')}
                  aria-hidden
                />
                <span
                  className={clsx(
                    'text-sm font-medium',
                    done ? 'text-neutral-500 line-through' : 'text-neutral-900 dark:text-neutral-100'
                  )}
                >
                  {item.label}
                </span>
              </div>
              {!done && (
                <div className="flex flex-wrap gap-2 ps-8 sm:ps-0">
                  {item.key === 'email_verified' ? (
                    <Button outline onClick={() => resend.mutate()} disabled={resend.isPending}>
                      {resend.isPending ? 'Mengirim...' : 'Kirim ulang'}
                    </Button>
                  ) : null}
                  <Button href={item.href} outline>
                    {item.action}
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {allDone && (
        <div className="border-t border-neutral-100 px-5 py-4 text-center dark:border-neutral-700">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">Semua langkah selesai — kerja bagus!</p>
        </div>
      )}

      <footer className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-700">
        <Link
          href="/help/panduan-memulai"
          className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Butuh bantuan? Baca panduan memulai
        </Link>
        <div className="flex justify-end gap-2">
        {allDone ? (
          <ButtonPrimary onClick={() => hide.mutate()} disabled={hide.isPending}>
            Selesai
          </ButtonPrimary>
        ) : (
          <Button outline onClick={() => hide.mutate()} disabled={hide.isPending}>
            Sembunyikan
          </Button>
        )}
        </div>
      </footer>
    </section>
  )
}
