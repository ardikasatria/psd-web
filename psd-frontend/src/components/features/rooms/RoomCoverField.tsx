'use client'

import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 4 * 1024 * 1024

type Props = {
  previewUrl: string | null
  onPreviewChange: (url: string | null) => void
  onFileChange: (file: File | null) => void
  disabled?: boolean
  className?: string
  label?: string
  previewAlt?: string
}

export function RoomCoverField({
  previewUrl,
  onPreviewChange,
  onFileChange,
  disabled,
  className,
  label = 'Foto sampul (opsional)',
  previewAlt = 'Pratinjau sampul',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const pickFile = (file: File | null) => {
    setLocalError(null)
    if (!file) {
      onFileChange(null)
      onPreviewChange(null)
      return
    }
    if (!ALLOWED.includes(file.type)) {
      setLocalError('Format harus JPG, PNG, atau WebP.')
      return
    }
    if (file.size > MAX_BYTES) {
      setLocalError('Ukuran maksimal 4 MB.')
      return
    }
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    onPreviewChange(URL.createObjectURL(file))
    onFileChange(file)
  }

  const clear = () => {
    pickFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={className}>
      <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</p>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (disabled) return
          pickFile(e.dataTransfer.files?.[0] ?? null)
        }}
        className={clsx(
          'relative overflow-hidden rounded-2xl border-2 border-dashed transition',
          previewUrl
            ? 'border-violet-200 dark:border-violet-800'
            : dragOver
              ? 'border-violet-400 bg-violet-50/80 dark:border-violet-500 dark:bg-violet-950/30'
              : 'border-neutral-200 bg-neutral-50/80 hover:border-violet-300 hover:bg-violet-50/40 dark:border-neutral-700 dark:bg-neutral-900/40 dark:hover:border-violet-700',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <div className="aspect-[21/9] w-full sm:aspect-[2.5/1]">
          {previewUrl ? (
            <>
              <Image src={previewUrl} alt={previewAlt} fill className="object-cover" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    clear()
                  }}
                  className="absolute end-3 top-3 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/70"
                  aria-label="Hapus sampul"
                >
                  <XMarkIcon className="size-4" />
                </button>
              )}
              <p className="absolute bottom-3 start-3 text-xs font-medium text-white/90">Klik untuk ganti gambar</p>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300">
                <PhotoIcon className="size-6" aria-hidden />
              </div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Seret foto atau klik untuk unggah
              </p>
              <p className="text-xs text-neutral-500">JPG, PNG, WebP · maks. 4 MB · rasio landscape disarankan</p>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(',')}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {localError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{localError}</p>}
    </div>
  )
}

export function RoomCoverHero({ coverUrl, title }: { coverUrl?: string | null; title: string }) {
  return (
    <div className="relative -mx-4 mb-6 aspect-[21/9] overflow-hidden rounded-2xl sm:mx-0 sm:aspect-[3/1]">
      {coverUrl ? (
        <Image src={coverUrl} alt="" fill className="object-cover" unoptimized priority />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-primary-600" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Ruang Ide</p>
        <h2 className="mt-1 line-clamp-2 text-xl font-bold text-white sm:text-2xl">{title}</h2>
      </div>
    </div>
  )
}
