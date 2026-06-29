'use client'

import { CommunityDiscoveryPanels } from '@/components/features/community/CommunityDiscoveryPanels'
import { CommunitySidebar } from '@/components/features/community/CommunitySidebar'
import { SocialFeed } from '@/components/features/social/SocialFeed'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/useAuth'
import { UserGroupIcon } from '@heroicons/react/24/outline'

export function CommunityPage() {
  const { isLoggedIn } = useAuth()

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          <FeaturePageHero
            title="Jejaring komunitas"
            subtitle="Terhubung dengan praktisi sains data, ikuti aktivitas mereka, dan bangun jejaring profesional di Indonesia."
            variant="compact"
            actions={
              isLoggedIn ? (
                <ButtonPrimary href="/leaderboard" className="!bg-white/15 !text-white hover:!bg-white/25">
                  <UserGroupIcon className="mr-1.5 inline size-4" aria-hidden />
                  Lihat peringkat
                </ButtonPrimary>
              ) : (
                <ButtonPrimary href="/login?next=/community">Masuk untuk ikuti</ButtonPrimary>
              )
            }
          />

          <CommunityDiscoveryPanels layout="featured" only={['top_tier', 'popular']} />

          <SocialFeed />

          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Butuh diskusi panjang? Kunjungi{' '}
            <Link href="/forum" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Forum PSD
            </Link>
            .
          </p>
        </div>

        <div className="w-full shrink-0 space-y-5 lg:sticky lg:top-24 lg:w-80">
          <CommunityDiscoveryPanels exclude={['top_tier', 'popular']} />
          <CommunitySidebar className="w-full" />
        </div>
      </div>
    </FeaturePageShell>
  )
}
