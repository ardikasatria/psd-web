'use client'

import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toPng } from 'html-to-image'
import {
  ArrowDownTrayIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  PrinterIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import {
  MemberCardFace,
  MemberCardPreview,
  type MemberCardData,
} from '@/components/features/settings/MemberCard'
import { SettingsSectionCard } from '@/components/features/settings/SettingsSectionCard'
import { SettingsShell } from '@/components/features/settings/SettingsShell'
import { getMe } from '@/lib/api/auth'
import { getMemberCard } from '@/lib/api/member-card'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'

async function downloadNode(node: HTMLElement, filename: string) {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    skipFonts: false,
  })
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export function MemberCardSettingsContent() {
  useAuthGuard()
  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const bothRef = useRef<HTMLDivElement>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const { data: meData, isLoading: meLoading, isError: meError, error: meLoadError } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  })

  const {
    data: cardData,
    isLoading: cardLoading,
    isError: cardError,
    error: cardLoadError,
  } = useQuery({
    queryKey: ['member-card'],
    queryFn: getMemberCard,
    retry: false,
    enabled: !!meData?.user,
  })

  const user = meData?.user
  const isLoading = meLoading || cardLoading
  const isError = meError || cardError
  const error = meLoadError ?? cardLoadError

  const memberCard: MemberCardData | null =
    user && cardData
      ? {
          name: user.name,
          email: user.email ?? '',
          tierName: user.tier?.name ?? 'Pemula',
          shareUrl: cardData.share_url,
        }
      : null

  const copyShareUrl = async () => {
    if (!cardData?.share_url) return
    await navigator.clipboard.writeText(cardData.share_url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const shareProfileUrl = async () => {
    if (!cardData?.share_url) return
    if (navigator.share) {
      await navigator.share({
        title: `Profil ${user?.name ?? 'PSD'}`,
        text: 'Lihat profil saya di Projek Sains Data',
        url: cardData.share_url,
      })
      return
    }
    await copyShareUrl()
  }

  const handleDownload = async (side: 'front' | 'back' | 'both') => {
    if (!memberCard) return
    setDownloading(side)
    try {
      if (side === 'front' && frontRef.current) {
        await downloadNode(frontRef.current, `psd-member-card-depan.png`)
      } else if (side === 'back' && backRef.current) {
        await downloadNode(backRef.current, `psd-member-card-belakang.png`)
      } else if (side === 'both' && bothRef.current) {
        await downloadNode(bothRef.current, `psd-member-card.png`)
      }
    } finally {
      setDownloading(null)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <DetailPageShell>
      <DetailPageHeader
        title="Kartu member"
        subtitle="Kartu loyalitas PSD dengan QR profil permanen — unduh, cetak, atau bagikan tautan Anda."
      />

      <SettingsShell active="member-card">
        <QueryState isLoading={isLoading} isError={isError} error={error}>
          {memberCard && cardData && (
            <div className="space-y-6">
              <SettingsSectionCard title="Pratinjau kartu" description="Desain resmi PSD — ketuk untuk membalik.">
                <MemberCardPreview data={memberCard} />
              </SettingsSectionCard>

              <SettingsSectionCard
                title="Tautan profil permanen"
                description="Dibuat sekali dan tidak berubah. Tempelkan di kartu fisik atau bagikan ke siapa saja."
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input readOnly value={cardData.share_url} className="font-mono text-sm" />
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" onClick={copyShareUrl}>
                      {copied ? (
                        <CheckIcon className="mr-1.5 size-4 text-green-600" aria-hidden />
                      ) : (
                        <ClipboardDocumentIcon className="mr-1.5 size-4" aria-hidden />
                      )}
                      {copied ? 'Tersalin' : 'Salin'}
                    </Button>
                    <Button type="button" onClick={shareProfileUrl}>
                      <ShareIcon className="mr-1.5 size-4" aria-hidden />
                      Bagikan
                    </Button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                  QR di kartu mengarah ke tautan ini. Siapa pun yang memindainya akan dibawa ke profil publik Anda.
                </p>
              </SettingsSectionCard>

              <SettingsSectionCard title="Unduh & cetak">
                <div className="flex flex-wrap gap-2">
                  <ButtonPrimary
                    type="button"
                    outline
                    disabled={!!downloading}
                    onClick={() => handleDownload('front')}
                  >
                    <ArrowDownTrayIcon className="mr-1.5 size-4" aria-hidden />
                    {downloading === 'front' ? 'Mengunduh…' : 'Unduh depan'}
                  </ButtonPrimary>
                  <ButtonPrimary
                    type="button"
                    outline
                    disabled={!!downloading}
                    onClick={() => handleDownload('back')}
                  >
                    <ArrowDownTrayIcon className="mr-1.5 size-4" aria-hidden />
                    {downloading === 'back' ? 'Mengunduh…' : 'Unduh belakang'}
                  </ButtonPrimary>
                  <ButtonPrimary type="button" disabled={!!downloading} onClick={() => handleDownload('both')}>
                    <ArrowDownTrayIcon className="mr-1.5 size-4" aria-hidden />
                    {downloading === 'both' ? 'Mengunduh…' : 'Unduh keduanya'}
                  </ButtonPrimary>
                  <Button type="button" onClick={handlePrint}>
                    <PrinterIcon className="mr-1.5 size-4" aria-hidden />
                    Cetak
                  </Button>
                </div>
              </SettingsSectionCard>

              {/* Off-screen render targets for export */}
              <div className="pointer-events-none fixed -left-[9999px] top-0 w-[1013px]" aria-hidden>
                <MemberCardFace ref={frontRef} side="front" data={memberCard} className="w-full" />
                <MemberCardFace ref={backRef} side="back" data={memberCard} className="mt-4 w-full" />
                <div ref={bothRef} className="mt-4 flex flex-col gap-6 bg-white p-4">
                  <MemberCardFace side="front" data={memberCard} className="w-full" />
                  <MemberCardFace side="back" data={memberCard} className="w-full" />
                </div>
              </div>

              <div ref={printRef} className="member-card-print-area hidden print:block">
                <div className="flex flex-col items-center gap-8 p-8">
                  <MemberCardFace side="front" data={memberCard} className="w-full max-w-3xl" />
                  <MemberCardFace side="back" data={memberCard} className="w-full max-w-3xl" />
                </div>
              </div>
            </div>
          )}
        </QueryState>
      </SettingsShell>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .member-card-print-area,
          .member-card-print-area * {
            visibility: visible !important;
          }
          .member-card-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </DetailPageShell>
  )
}
