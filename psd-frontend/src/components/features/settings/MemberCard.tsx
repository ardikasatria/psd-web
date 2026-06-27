'use client'

import clsx from 'clsx'
import { Orbitron } from 'next/font/google'
import { forwardRef, useEffect, useMemo, useState, type CSSProperties } from 'react'
import QRCode from 'qrcode'

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
})

const CARD_W = 1013
const CARD_H = 638

export type MemberCardData = {
  name: string
  email: string
  tierName: string
  shareUrl: string
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return { first: parts[0] ?? '', last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
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
  const { first, last } = useMemo(() => splitName(data.name), [data.name])

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

      {side === 'back' && (
        <>
          <div
            className="absolute font-extrabold uppercase leading-none tracking-wide text-white"
            style={{ left: '8.7%', top: '17%', fontSize: 'clamp(1.1rem, 4.8vw, 2.6rem)' }}
          >
            <p>{first || '—'}</p>
            {last ? <p style={{ marginTop: '0.35em' }}>{last}</p> : null}
          </div>

          <p
            className="absolute font-semibold lowercase text-white/95"
            style={{
              left: '8.9%',
              top: '44%',
              fontSize: 'clamp(0.75rem, 2.2vw, 1.15rem)',
              maxWidth: '82%',
            }}
          >
            {data.email}
          </p>

          <div
            className="absolute flex items-center justify-center text-center font-extrabold uppercase text-white"
            style={{
              left: '29.3%',
              top: '69.3%',
              width: '35.6%',
              height: '13.5%',
              fontSize: 'clamp(1rem, 3.8vw, 2.2rem)',
            }}
          >
            <span className="px-2">{data.tierName}</span>
          </div>

          <div
            className="absolute overflow-hidden rounded-md bg-white p-1 shadow-sm"
            style={{ left: '8.9%', top: '63.7%', width: '17.2%', height: '24.9%' }}
          >
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR profil" className="size-full object-contain" />
            ) : (
              <div className="size-full animate-pulse bg-neutral-200" />
            )}
          </div>
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
