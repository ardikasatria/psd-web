'use client'

import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { SettingsShell } from '@/components/features/settings/SettingsShell'
import { getMe } from '@/lib/api/auth'
import { profilePath } from '@/lib/routes/profile'
import { staffRoleLabel } from '@/lib/auth/roles'
import Avatar from '@/shared/Avatar'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ChevronRightIcon,
  EnvelopeIcon,
  IdentificationIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

export function SettingsContent() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  })

  if (isError) {
    return (
      <DetailPageShell>
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-600">
          <p className="text-neutral-600 dark:text-neutral-400">Masuk untuk mengakses pengaturan akun.</p>
          <ButtonPrimary href="/login?next=/settings" className="mt-4">
            Masuk
          </ButtonPrimary>
        </div>
      </DetailPageShell>
    )
  }

  const user = data?.user

  return (
    <DetailPageShell>
      <DetailPageHeader
        title="Pengaturan akun"
        subtitle="Kelola profil, keamanan, dan preferensi akun PSD Anda."
      />

      <SettingsShell active="overview">
        <QueryState isLoading={isLoading} isError={false} error={error}>
          {user && (
            <div className="space-y-6">
              {/* Kartu profil — desktop: horizontal, mobile: vertikal */}
              <section className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-800">
                <div className="h-1 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400" aria-hidden />
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 lg:gap-8">
                  <div
                    className="h-24 shrink-0 sm:h-auto sm:w-48 lg:w-56"
                    style={{
                      background: user.accent_color
                        ? `linear-gradient(135deg, ${user.accent_color}, color-mix(in srgb, ${user.accent_color} 60%, #f09394))`
                        : 'linear-gradient(135deg, #4572b7, #f09394)',
                    }}
                  />
                  <div className="relative flex flex-1 flex-col gap-4 p-5 sm:-ms-4 sm:py-6 lg:p-8">
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                      <div className="-mt-14 sm:-mt-0 sm:shrink-0">
                        <Avatar
                          src={user.avatar_url ?? undefined}
                          alt={user.name}
                          className="size-20 ring-4 ring-white dark:ring-neutral-800 lg:size-24"
                          width={96}
                          height={96}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold tracking-tight lg:text-2xl">{user.name}</h2>
                          {user.email_verified ? (
                            <Badge color="green">Terverifikasi</Badge>
                          ) : (
                            <Badge color="amber">Belum verifikasi</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-neutral-500 dark:text-neutral-400">@{user.username}</p>
                        {user.bio && (
                          <p className="mt-2 max-w-2xl text-sm text-neutral-700 dark:text-neutral-300">{user.bio}</p>
                        )}
                      </div>
                      <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:flex-col lg:flex-row">
                        <ButtonPrimary href={profilePath(user.username)} className="!rounded-xl">
                          Lihat profil
                        </ButtonPrimary>
                        <ButtonPrimary href="/settings/profile" outline className="!rounded-xl">
                          Edit profil
                        </ButtonPrimary>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Info akun — desktop: 3 kolom */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard
                  icon={EnvelopeIcon}
                  label="Email"
                  value={user.email ?? '—'}
                  action={
                    !user.email_verified ? (
                      <Link href="/settings/security" className="text-sm font-medium text-primary-600 hover:underline">
                        Verifikasi
                      </Link>
                    ) : undefined
                  }
                />
                <InfoCard icon={IdentificationIcon} label="Username" value={`@${user.username}`} />
                <InfoCard
                  icon={UserCircleIcon}
                  label="Peran"
                  value={
                    user.account_type === 'organization'
                      ? 'Organisasi'
                      : staffRoleLabel(user.role) ?? 'Pengguna'
                  }
                  className="sm:col-span-2 lg:col-span-1"
                />
              </section>

              {/* Shortcut desktop */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ShortcutCard
                  href="/settings/profile"
                  title="Personalisasi profil"
                  description="Sesuaikan banner, accent color, status, tentang, dan tautan profil publik Anda."
                  cta="Buka editor profil"
                />
                {user.account_type === 'organization' && (
                  <ShortcutCard
                    href="/me/org/teams"
                    title="Tim organisasi"
                    description="Kelola tim kolaborasi, undang anggota, dan bangun portofolio UMKM bersama."
                    cta="Buka hub organisasi"
                  />
                )}
                <ShortcutCard
                  href="/settings/security"
                  title="Keamanan akun"
                  description="Ganti kata sandi, perbarui email, dan kelola verifikasi akun."
                  cta="Kelola keamanan"
                />
                <ShortcutCard
                  href="/settings/git"
                  title="Git & SSH"
                  description="Daftarkan kunci SSH untuk push dan clone repository Git PSD."
                  cta="Kelola kunci SSH"
                />
                <ShortcutCard
                  href="/settings/notifications"
                  title="Notifikasi"
                  description="Atur email event, kompetisi, balasan forum, dan notifikasi dalam aplikasi."
                  cta="Kelola notifikasi"
                />
                <ShortcutCard
                  href="/settings/privacy"
                  title="Privasi"
                  description="Kontrol visibilitas profil, email publik, dan kemunculan di pencarian."
                  cta="Kelola privasi"
                />
                <ShortcutCard
                  href="/settings/member-card"
                  title="Kartu member"
                  description="Kartu loyalitas PSD dengan QR profil permanen — unduh, cetak, atau bagikan."
                  cta="Buka kartu member"
                />
                <ShortcutCard
                  href="/settings/appearance"
                  title="Tampilan"
                  description="Tema terang/gelap, bahasa, dan pengurangan animasi."
                  cta="Kelola tampilan"
                />
              </section>
            </div>
          )}
        </QueryState>
      </SettingsShell>
    </DetailPageShell>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200/80 bg-white p-4 lg:p-5 dark:border-neutral-700 dark:bg-neutral-800 ${className ?? ''}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {label}
          </p>
          <p className="mt-1 truncate font-medium text-neutral-900 dark:text-neutral-100">{value}</p>
          {action && <div className="mt-2">{action}</div>}
        </div>
      </div>
    </div>
  )
}

function ShortcutCard({
  href,
  title,
  description,
  cta,
}: {
  href: string
  title: string
  description: string
  cta: string
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white p-5 transition hover:border-primary-300 hover:shadow-md lg:p-6 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-700"
    >
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{description}</p>
      </div>
      <span className="mt-4 inline-flex items-center text-sm font-semibold text-primary-600 group-hover:underline dark:text-primary-400">
        {cta}
        <ChevronRightIcon className="ml-1 size-4 motion-safe:transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}