'use client'

import { highlightGradientBr } from '@/components/common/featureGradients'
import { listTeams } from '@/lib/api/teams'
import { useAuth } from '@/lib/auth/useAuth'
import { TeamSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  BuildingOffice2Icon,
  ChartBarIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

function isUmkmTeam(team: TeamSummary) {
  const hay = `${team.name} ${team.description ?? ''} ${team.focus ?? ''}`.toLowerCase()
  return hay.includes('umkm') || hay.includes('organisasi') || hay.includes('kolektif')
}

export function OrgUmkmShowcase({ onCreateClick }: { onCreateClick?: () => void }) {
  const { user, isLoggedIn } = useAuth()
  const isOrg = user?.account_type === 'organization'

  const { data } = useQuery({
    queryKey: ['teams', 'umkm-showcase'],
    queryFn: () => listTeams('', 1),
    staleTime: 120_000,
  })

  const umkmTeams = (data?.items ?? []).filter(isUmkmTeam).slice(0, 3)

  return (
    <section className={highlightGradientBr.team}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <BuildingOffice2Icon className="size-3.5" aria-hidden />
            Organisasi & UMKM
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Kolaborasi tim untuk dampak nyata
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Organisasi dan UMKM dapat membentuk tim resmi di PSD — kelola anggota, aset bersama, diskusi,
            dan ikut kompetisi dengan identitas kolektif.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <li className="flex items-start gap-2">
              <UserGroupIcon className="mt-0.5 size-4 shrink-0 text-primary-500" aria-hidden />
              Undang praktisi, mahasiswa, atau mitra ke tim organisasi Anda
            </li>
            <li className="flex items-start gap-2">
              <ChartBarIcon className="mt-0.5 size-4 shrink-0 text-sky-500" aria-hidden />
              Bangun portofolio analytics & model untuk studi kasus UMKM
            </li>
            <li className="flex items-start gap-2">
              <SparklesIcon className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
              Tampil di direktori tim dan kompetisi sebagai unit kolaboratif
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            {isOrg && isLoggedIn ? (
              <>
                <ButtonPrimary href="/me/org/teams">Kelola tim organisasi</ButtonPrimary>
                <ButtonPrimary type="button" outline onClick={onCreateClick}>
                  Buat tim baru
                </ButtonPrimary>
              </>
            ) : isLoggedIn ? (
              <ButtonPrimary type="button" onClick={onCreateClick}>
                Buat tim
              </ButtonPrimary>
            ) : (
              <ButtonPrimary href="/login?next=/teams">Masuk untuk mulai</ButtonPrimary>
            )}
            <ButtonPrimary href="/competitions" outline>
              Lihat kompetisi
            </ButtonPrimary>
          </div>
        </div>

        {umkmTeams.length > 0 && (
          <div className="w-full shrink-0 space-y-3 lg:max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Tim UMKM & organisasi
            </p>
            {umkmTeams.map((t) => (
              <Link
                key={t.slug}
                href={`/teams/${t.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/95 p-3 transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/95"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                  <BuildingOffice2Icon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{t.name}</p>
                  <p className="text-xs text-neutral-500">
                    {t.member_count ?? 0} anggota
                    {t.focus ? ` · ${t.focus}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
