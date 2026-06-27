'use client'

import { uploadEventMedia } from '@/lib/api/events'
import { PhotoIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Image from 'next/image'
import { useRef, useState } from 'react'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 4 * 1024 * 1024
const MAX_ITEMS = 8

type Props = {
  urls: string[]
  onChange: (urls: string[]) => void
  disabled?: boolean
  label?: string
}

export function MediaGalleryField({
  urls,
  onChange,
  disabled,
  label = 'Galeri foto / carousel (opsional)',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length || disabled) return
    setError(null)
    const next = [...urls]
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (next.length >= MAX_ITEMS) break
        if (!ALLOWED.includes(file.type)) {
          setError('Format harus JPG, PNG, atau WebP.')
          continue
        }
        if (file.size > MAX_BYTES) {
          setError('Ukuran maksimal 4 MB per gambar.')
          continue
        }
        const res = await uploadEventMedia(file)
        next.push(res.url)
      }
      onChange(next)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = (index: number) => onChange(urls.filter((_, i) => i !== index))

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</p>
      <p className="mb-3 text-xs text-neutral-500">Unggah hingga {MAX_ITEMS} gambar untuk carousel di halaman detail event.</p>

      {urls.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {urls.map((url, i) => (
            <div key={`${url}-${i}`} className="relative aspect-video overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
              <Image src={url} alt="" fill className="object-cover" unoptimized />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute end-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white"
                  aria-label="Hapus gambar"
                >
                  <TrashIcon className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {urls.length < MAX_ITEMS && (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            'flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-sm transition',
            'border-neutral-200 hover:border-primary-300 hover:bg-primary-50/40 dark:border-neutral-700 dark:hover:border-primary-700',
            (disabled || uploading) && 'pointer-events-none opacity-60',
          )}
        >
          {uploading ? (
            'Mengunggah...'
          ) : (
            <>
              <PhotoIcon className="size-5 text-neutral-400" aria-hidden />
              <span className="font-medium text-neutral-700 dark:text-neutral-300">Tambah foto ke carousel</span>
              <PlusIcon className="size-4 text-neutral-400" aria-hidden />
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(',')}
        multiple
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => void pickFiles(e.target.files)}
      />
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
