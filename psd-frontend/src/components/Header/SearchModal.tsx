'use client'

import { SearchHitRow } from '@/components/features/search/SearchHitRow'
import { universalSearch } from '@/lib/api/search'
import { KIND_ORDER, kindMeta } from '@/lib/search/kindMeta'
import type { SearchHit, SearchKind, SearchResponse } from '@/types/api'
import { Button } from '@/shared/Button'
import ButtonCircle from '@/shared/ButtonCircle'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRouter } from 'next/navigation'
import { FC, useEffect, useId, useMemo, useRef, useState } from 'react'

const RECOMMENDED = [
  { label: 'Machine learning', q: 'machine learning' },
  { label: 'Dataset UMKM', q: 'umkm' },
  { label: 'Kompetisi', q: 'type:kompetisi' },
  { label: 'NLP Bahasa Indonesia', q: 'nlp' },
]

const OPERATOR_HINTS = [
  { op: 'type:akun', desc: 'batasi tipe' },
  { op: '@username', desc: 'cari akun' },
  { op: '#tag', desc: 'filter tag' },
  { op: 'owner:nama', desc: 'filter pemilik' },
]

interface Props {
  type?: 'type1' | 'type2'
}

/** Susun hits terkelompok menjadi daftar datar sesuai urutan kategori (untuk navigasi keyboard). */
function flattenGrouped(grouped: Record<string, SearchHit[]>): SearchHit[] {
  const flat: SearchHit[] = []
  for (const kind of KIND_ORDER) {
    const hits = grouped[kind]
    if (hits?.length) flat.push(...hits)
  }
  return flat
}

const SearchModal: FC<Props> = ({ type = 'type1' }) => {
  const router = useRouter()
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SearchResponse | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = query.trim()

  useEffect(() => {
    if (!open || trimmed.length < 2) {
      setData(null)
      setLoading(false)
      setActiveIndex(-1)
      return
    }
    setLoading(true)
    const timer = setTimeout(() => {
      universalSearch(trimmed, { per_category: 4, limit: 24 })
        .then((res) => {
          setData(res)
          setActiveIndex(-1)
        })
        .catch(() => setData(null))
        .finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(timer)
  }, [open, trimmed])

  const flat = useMemo(() => (data ? flattenGrouped(data.grouped) : []), [data])
  const hasHits = flat.length > 0

  function close() {
    setOpen(false)
    setQuery('')
    setData(null)
    setActiveIndex(-1)
  }

  function goSearch(q: string) {
    const params = new URLSearchParams()
    params.set('q', q.trim())
    router.push(`/search?${params.toString()}`)
    close()
  }

  function navigate(url: string) {
    router.push(url)
    close()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!hasHits) return
      setActiveIndex((i) => (i + 1) % flat.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!hasHits) return
      setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && flat[activeIndex]) {
        navigate(flat[activeIndex].url)
      } else if (trimmed) {
        goSearch(trimmed)
      }
    } else if (e.key === 'Escape') {
      close()
    }
  }

  const buttonOpenModal2 = () => (
    <>
      <div className="hidden md:block">
        <Button outline className="w-full justify-between px-4!" onClick={() => setOpen(true)}>
          <span className="truncate text-sm/6 font-normal text-neutral-500 dark:text-neutral-400">
            Cari akun, aset, kompetisi…
          </span>
          <HugeiconsIcon icon={Search01Icon} size={24} className="ms-auto" />
        </Button>
      </div>
      <div className="-ms-1 md:hidden">
        <ButtonCircle plain onClick={() => setOpen(true)} aria-label="Buka pencarian">
          <HugeiconsIcon icon={Search01Icon} size={24} />
        </ButtonCircle>
      </div>
    </>
  )

  const buttonOpenModal1 = () => (
    <ButtonCircle plain onClick={() => setOpen(true)} aria-label="Buka pencarian">
      <HugeiconsIcon icon={Search01Icon} size={24} />
    </ButtonCircle>
  )

  let runningIndex = -1

  return (
    <>
      {type === 'type1' ? buttonOpenModal1() : buttonOpenModal2()}

      <Dialog className="relative z-50" open={open} onClose={close}>
        <DialogBackdrop
          transition
          className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-sm transition-opacity duration-300 ease-out data-closed:opacity-0"
        />

        <div className="hidden-scrollbar fixed inset-0 z-50 flex w-full overflow-y-auto sm:p-6 md:pt-20 md:pb-10">
          <DialogPanel
            transition
            className="mx-auto w-full max-w-2xl transform self-end overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-black/5 transition duration-300 ease-out data-closed:translate-y-10 data-closed:opacity-0 sm:self-start sm:rounded-2xl dark:bg-neutral-900 dark:ring-white/10"
          >
            {/* INPUT */}
            <div className="relative border-b border-neutral-100 dark:border-neutral-800">
              <MagnifyingGlassIcon
                className="pointer-events-none absolute start-4 top-4 size-5 text-neutral-400 dark:text-neutral-500"
                aria-hidden
              />
              <input
                ref={inputRef}
                autoFocus
                role="combobox"
                aria-expanded={hasHits}
                aria-controls={listboxId}
                aria-activedescendant={
                  activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
                }
                className="h-13 w-full border-0 bg-transparent ps-12 pe-12 text-neutral-900 placeholder:text-neutral-400 focus:ring-0 sm:text-sm dark:text-neutral-100 dark:placeholder:text-neutral-500"
                placeholder="Cari akun, organisasi, aset, kompetisi, tim, forum…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                aria-label="Pencarian universal"
              />
              <button
                className="absolute end-3 top-1/2 z-10 -translate-y-1/2 text-xs text-neutral-400 focus:outline-none dark:text-neutral-500"
                onClick={close}
                type="button"
                aria-label="Tutup pencarian"
              >
                <XMarkIcon className="block size-5 sm:hidden" />
                <kbd className="hidden rounded-md border border-neutral-200 px-1.5 py-0.5 font-sans sm:block dark:border-neutral-700">
                  Esc
                </kbd>
              </button>
            </div>

            <div
              id={listboxId}
              role="listbox"
              className="hidden-scrollbar max-h-[70vh] overflow-y-auto p-2"
            >
              {/* HASIL TERKELOMPOK */}
              {trimmed.length >= 2 && (
                <>
                  {loading && (
                    <p className="px-3 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                      Mencari…
                    </p>
                  )}

                  {!loading && !hasHits && (
                    <p className="px-3 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                      Tidak ada hasil untuk &ldquo;{trimmed}&rdquo;
                    </p>
                  )}

                  {!loading &&
                    hasHits &&
                    KIND_ORDER.map((kind) => {
                      const hits = data!.grouped[kind]
                      if (!hits?.length) return null
                      const meta = kindMeta(kind as SearchKind)
                      return (
                        <div key={kind} className="mb-1.5">
                          <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
                            {meta.label}
                          </p>
                          {hits.map((hit) => {
                            runningIndex += 1
                            const idx = runningIndex
                            return (
                              <button
                                key={`${hit.kind}-${hit.id}`}
                                id={`${listboxId}-opt-${idx}`}
                                role="option"
                                aria-selected={activeIndex === idx}
                                type="button"
                                className="w-full text-left"
                                onMouseEnter={() => setActiveIndex(idx)}
                                onClick={() => navigate(hit.url)}
                              >
                                <SearchHitRow hit={hit} focused={activeIndex === idx} />
                              </button>
                            )
                          })}
                        </div>
                      )
                    })}

                  {!loading && hasHits && (
                    <button
                      type="button"
                      onClick={() => goSearch(trimmed)}
                      className="mt-1 flex w-full items-center justify-between rounded-xl bg-primary-50 px-3 py-2.5 text-sm font-medium text-primary-700 motion-safe:transition-colors hover:bg-primary-100 dark:bg-primary-950/40 dark:text-primary-300 dark:hover:bg-primary-950/60"
                    >
                      <span>
                        Lihat semua hasil untuk &ldquo;{trimmed}&rdquo;
                        {data?.total ? ` (${data.total})` : ''}
                      </span>
                      <ArrowRightIcon className="size-4" aria-hidden />
                    </button>
                  )}
                </>
              )}

              {/* KEADAAN AWAL */}
              {trimmed.length < 2 && (
                <div className="space-y-4 p-1">
                  <div>
                    <p className="px-2 pb-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
                      Pencarian populer
                    </p>
                    <div className="flex flex-wrap gap-2 px-2">
                      {RECOMMENDED.map((r) => (
                        <button
                          key={r.label}
                          type="button"
                          onClick={() => goSearch(r.q)}
                          className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 motion-safe:transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="px-2 pb-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
                      Operator pencarian
                    </p>
                    <ul className="space-y-1 px-2">
                      {OPERATOR_HINTS.map((h) => (
                        <li
                          key={h.op}
                          className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400"
                        >
                          <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                            {h.op}
                          </code>
                          <span className="text-xs">{h.desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}

export default SearchModal
