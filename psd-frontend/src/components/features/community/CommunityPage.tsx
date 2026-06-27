'use client'

import { CommunitySidebar } from '@/components/features/community/CommunitySidebar'
import { SocialFeed } from '@/components/features/social/SocialFeed'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/useAuth'

export function CommunityPage() {
  const { isLoggedIn } = useAuth()

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          <FeaturePageHero
            title="Feed"
            subtitle="Berbagi update cepat, foto, dan aset dengan pengikut Anda."
            variant="compact"
            actions={
              isLoggedIn ? (
                <ButtonPrimary href="/explore">Temukan orang</ButtonPrimary>
              ) : (
                <ButtonPrimary href="/login?next=/community">Masuk</ButtonPrimary>
              )
            }
          />

          <SocialFeed />

          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Butuh diskusi panjang? Kunjungi{' '}
            <Link href="/forum" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Forum PSD
            </Link>
            .
          </p>
        </div>

        <CommunitySidebar className="w-full shrink-0 lg:sticky lg:top-24 lg:w-80" />
      </div>
    </FeaturePageShell>
  )
}
