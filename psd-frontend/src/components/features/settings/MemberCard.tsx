'use client'

import { TIER_BADGE_FILES } from '@/lib/gamification/config'
import clsx from 'clsx'
import { Orbitron } from 'next/font/google'
import { forwardRef, useEffect, useState, type CSSProperties } from 'react'
import QRCode from 'qrcode'

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
})

const CARD_W = 1013
const CARD_H = 638

export type MemberCardData = {
  username: string
  email: string
  tierLevel: number
  shareUrl: string
}

function badgeSrc(tierLevel: number) {
  const idx = Math.min(Math.max(tierLevel, 0), TIER_BADGE_FILES.length - 1)
  return `/badges/${TIER_BADGE_FILES[idx]}`
}

function splitUsername(username: string) {
  const handle = username.replace(/^@/, '').trim().toUpperCase()
  if (!handle) return { line1: '—', line2: '' }
  if (handle.length <= 14) return { line1: handle, line2: '' }
  const mid = Math.ceil(handle.length / 2)
  return { line1: handle.slice(0, mid), line2: handle.slice(mid) }
}

type MemberCardFaceProps = {
  side: 'front' | 'back'
  data: MemberCardData
  className?: string
  style?: CSSProperties
}

export const MemberCardFace = forwardRef<HTMLDivElement, MemberCardFaceProps>(function MemberCardFace(
  { side, data, className, style },
  ref,
) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const { line1, line2 } = splitUsername(data.username)

  useEffect(() => {
    if (side !== 'back' || !data.shareUrl) return
    let cancelled = false
    QRCode.toDataURL(data.shareUrl, {
      margin: 1,
      width: 320,
      color: { dark: '#1a1f2e', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [side, data.shareUrl])

  const bg =
    side === 'front' ? '/member-card/PSD-Member-card-01.svg' : '/member-card/PSD-Member-card-02.svg'

  return (
    <div
      ref={ref}
      role="img"
      aria-label={side === 'front' ? 'Kartu member PSD — sisi depan' : 'Kartu member PSD — sisi belakang'}
      className={clsx(
        'member-card-face relative overflow-hidden rounded-[13px] shadow-xl ring-1 ring-black/10',
        orbitron.className,
        className,
      )}
      style={{ aspectRatio: `${CARD_W} / ${CARD_H}`, ...style }}
    >
      <img
        src={bg}
        alt=""
        className="absolute inset-0 size-full object-cover"
        draggable={false}
      />

      {side === 'front' && (
        <p
          className="absolute flex items-center justify-center text-center font-extrabold normal-case text-white"
          style={{
            left: '17%',
            top: '37.3%',
            width: '66%',
            height: '19.3%',
            fontSize: 'clamp(1.2rem, 4.2vw, 2.5rem)',
            letterSpacing: '0.02em',
            lineHeight: 1.1,
          }}
        >
          Projek Sains Data
        </p>
      )}

      {side === 'back' && (
        <>
          {/* 1. Username */}
          <div
            className="absolute font-extrabold uppercase leading-none tracking-wide text-neutral-900"
            style={{ left: '8.7%', top: '17%', fontSize: 'clamp(1.1rem, 4.8vw, 2.6rem)', maxWidth: '55%' }}
          >
            <p>{line1}</p>
            {line2 ? <p style={{ marginTop: '0.35em' }}>{line2}</p> : null}
          </div>

          {/* 2. Email */}
          <p
            className="absolute font-extrabold lowercase text-neutral-900"
            style={{
              left: '8.9%',
              top: '47%',
              fontSize: 'clamp(0.7rem, 2vw, 1.05rem)',
              maxWidth: '82%',
            }}
          >
            {data.email || '—'}
          </p>

          {/* 3. Projek Sains Data */}
          <p
            className="absolute font-extrabold uppercase tracking-[0.12em] text-[#717990]"
            style={{
              left: '8.9%',
              top: '54%',
              fontSize: 'clamp(0.65rem, 1.8vw, 1rem)',
              maxWidth: '82%',
            }}
          >
            Projek Sains Data
          </p>

          {/* 4a. QR */}
          <div
            className="absolute overflow-hidden rounded-sm bg-white p-1 shadow-sm"
            style={{ left: '8.9%', top: '63.7%', width: '17.2%', height: '24.9%' }}
          >
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR profil" className="size-full object-contain" />
            ) : (
              <div className="size-full animate-pulse bg-neutral-200" />
            )}
          </div>

          {/* 4b. Badge gamifikasi */}
          <div
            className="absolute flex items-center justify-center"
            style={{ left: '29.3%', top: '63.7%', width: '35.6%', height: '24.9%' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={badgeSrc(data.tierLevel)}
              alt=""
              className="max-h-full max-w-full object-contain drop-shadow-md"
              draggable={false}
            />
          </div>

          {/* 5. URL di bawah badge */}
          <p
            className="absolute text-center font-semibold lowercase tracking-normal text-[#717990]"
            style={{
              left: '29.3%',
              top: '90%',
              width: '35.6%',
              fontSize: 'clamp(0.55rem, 1.5vw, 0.85rem)',
            }}
          >
            projeksainsdata.com
          </p>
        </>
      )}
    </div>
  )
})

type MemberCardPreviewProps = {
  data: MemberCardData
  className?: string
}

export function MemberCardPreview({ data, className }: MemberCardPreviewProps) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className={clsx('space-y-4', className)}>
      <div className="mx-auto w-full max-w-2xl [perspective:1200px]">
        <button
          type="button"
          onClick={() => setFlipped((v) => !v)}
          className="group relative mx-auto block w-full text-left"
          aria-label={flipped ? 'Tampilkan sisi depan kartu' : 'Tampilkan sisi belakang kartu'}
        >
          <div
            className="relative w-full transition-transform duration-700 motion-safe:transform-gpu"
            style={{
              aspectRatio: `${CARD_W} / ${CARD_H}`,
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : undefined,
            }}
          >
            <MemberCardFace
              side="front"
              data={data}
              className="absolute inset-0 w-full"
              style={{ backfaceVisibility: 'hidden' }}
            />
            <MemberCardFace
              side="back"
              data={data}
              className="absolute inset-0 w-full"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            />
          </div>
          <p className="mt-3 text-center text-sm text-neutral-500 group-hover:text-primary-600 dark:text-neutral-400 dark:group-hover:text-primary-400">
            Ketuk kartu untuk membalik ({flipped ? 'belakang' : 'depan'})
          </p>
        </button>
      </div>
    </div>
  )
}
