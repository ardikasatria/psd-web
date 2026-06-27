'use client'

import { search } from '@/lib/api/search'
import {
  competitionHref,
  hitToCompetition,
  hitToRepo,
  repoHref,
} from '@/lib/search/hits'
import { CompetitionSummary, RepoSummary, SearchResult } from '@/types/api'
import { Button } from '@/shared/Button'
import ButtonCircle from '@/shared/ButtonCircle'
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { ArrowUpRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import {
  DatabaseIcon,
  FolderDetailsIcon,
  Search01Icon,
  Target02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, IconSvgElement } from '@hugeicons/react'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { FC, useEffect, useMemo, useState } from 'react'

interface QuickOption {
  type: 'recommended' | 'quick-action' | 'view-all'
  name: string
  icon: IconSvgElement
  uri: string
}

type SearchItem =
  | QuickOption
  | { type: 'repo'; repo: RepoSummary }
  | { type: 'competition'; competition: CompetitionSummary }

const recommendedSearches: QuickOption[] = [
  {
    type: 'recommended',
    name: 'Machine learning',
    icon: Search01Icon,
    uri: '/search?q=machine%20learning',
  },
  {
    type: 'recommended',
    name: 'Dataset pemerintah',
    icon: DatabaseIcon,
    uri: '/search?q=dataset%20pemerintah',
  },
  {
    type: 'recommended',
    name: 'Kompetisi aktif',
    icon: Target02Icon,
    uri: '/search?q=kompetisi&type=competitions',
  },
  {
    type: 'recommended',
    name: 'Visualisasi data',
    icon: Search01Icon,
    uri: '/search?q=visualisasi',
  },
]

const quickActions: QuickOption[] = [
  {
    type: 'quick-action',
    name: 'Buka halaman pencarian',
    icon: Search01Icon,
    uri: '/search?q=',
  },
  {
    type: 'quick-action',
    name: 'Cari aset saja',
    icon: FolderDetailsIcon,
    uri: '/search?q=&type=repos',
  },
  {
    type: 'quick-action',
    name: 'Cari kompetisi saja',
    icon: Target02Icon,
    uri: '/search?q=&type=competitions',
  },
  {
    type: 'quick-action',
    name: 'Jelajahi aset',
    icon: DatabaseIcon,
    uri: '/explore',
  },
]

interface Props {
  type?: 'type1' | 'type2'
}

const SearchModal: FC<Props> = ({ type = 'type1' }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult | null>(null)

  const trimmed = query.trim()

  useEffect(() => {
    if (!open || trimmed.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(() => {
      search(trimmed)
        .then(setResults)
        .catch(() => setResults({ repos: [], competitions: [] }))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [open, trimmed])

  const repoHits = useMemo(
    () => (results?.repos ?? []).slice(0, 4).map(hitToRepo),
    [results]
  )
  const compHits = useMemo(
    () => (results?.competitions ?? []).slice(0, 3).map(hitToCompetition),
    [results]
  )
  const hasHits = repoHits.length > 0 || compHits.length > 0

  const close = () => {
    setOpen(false)
    setQuery('')
    setResults(null)
  }

  const goSearch = (q: string, typeFilter?: string) => {
    const params = new URLSearchParams()
    params.set('q', q.trim())
    if (typeFilter) params.set('type', typeFilter)
    router.push(`/search?${params.toString()}`)
    close()
  }

  const handleSelect = (item: SearchItem | null) => {
    if (!item) return
    if (item.type === 'recommended' || item.type === 'quick-action') {
      if (item.uri === '/explore') {
        router.push(item.uri)
      } else if (item.uri.includes('q=&')) {
        const [path, search] = item.uri.split('?')
        const params = new URLSearchParams(search)
        params.set('q', trimmed)
        router.push(`${path}?${params.toString()}`)
      } else if (item.uri.endsWith('q=')) {
        goSearch(trimmed)
      } else {
        router.push(item.uri)
      }
    } else if (item.type === 'view-all') {
      goSearch(trimmed)
    } else if (item.type === 'repo') {
      router.push(repoHref(item.repo))
    } else if (item.type === 'competition') {
      router.push(competitionHref(item.competition))
    }
    close()
  }

  const buttonOpenModal2 = () => (
    <>
      <div className="hidden md:block">
        <Button outline className="w-full justify-between px-4!" onClick={() => setOpen(true)}>
          <span className="truncate text-sm/6 font-normal text-neutral-500 dark:text-neutral-400">
            Cari...
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

  return (
    <>
      {type === 'type1' ? buttonOpenModal1() : buttonOpenModal2()}

      <Dialog className="relative z-50" open={open} onClose={close}>
        <DialogBackdrop
          transition
          className="fixed inset-0 z-50 bg-neutral-900/50 transition-opacity duration-300 ease-out data-closed:opacity-0"
        />

        <div className="fixed inset-0 z-50 hidden-scrollbar flex w-full overflow-y-auto sm:p-6 md:pt-20 md:pb-10">
          <DialogPanel
            transition
            className="mx-auto w-full max-w-2xl transform divide-y divide-gray-100 self-end overflow-hidden bg-white shadow-2xl ring-1 ring-black/5 transition duration-300 ease-out data-closed:translate-y-10 data-closed:opacity-0 sm:self-start sm:rounded-xl dark:divide-gray-700 dark:bg-neutral-800 dark:ring-white/10"
          >
            <Combobox onChange={handleSelect}>
              <div className="relative">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute start-4 top-3.5 h-5 w-5 text-gray-400 dark:text-gray-300"
                  aria-hidden="true"
                />
                <div className="pe-9">
                  <ComboboxInput
                    autoFocus
                    className="h-12 w-full border-0 bg-transparent ps-11 pe-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm dark:text-gray-100 dark:placeholder:text-gray-300"
                    placeholder="Cari..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && trimmed) {
                        e.preventDefault()
                        goSearch(trimmed)
                      }
                    }}
                    data-autofocus
                    aria-label="Pencarian global"
                  />
                </div>
                <button
                  className="absolute end-3 top-1/2 z-10 -translate-y-1/2 text-xs text-neutral-400 focus:outline-none sm:end-4 dark:text-neutral-300"
                  onClick={close}
                  type="button"
                  aria-label="Tutup pencarian"
                >
                  <XMarkIcon className="block h-5 w-5 sm:hidden" />
                  <span className="hidden sm:block">
                    <kbd className="font-sans">Esc</kbd>
                  </span>
                </button>
              </div>

              <ComboboxOptions
                static
                as="ul"
                className="hidden-scrollbar max-h-[70vh] scroll-py-2 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700"
              >
                {trimmed.length >= 2 && (
                  <li className="p-2">
                    {loading && (
                      <p className="px-3 py-4 text-sm text-neutral-500">Mencari...</p>
                    )}
                    {!loading && !hasHits && (
                      <p className="px-3 py-4 text-sm text-neutral-500">
                        Tidak ada hasil untuk &ldquo;{trimmed}&rdquo;
                      </p>
                    )}
                    {!loading && hasHits && (
                      <ul className="text-sm text-gray-700 dark:text-gray-300">
                        {repoHits.length > 0 && (
                          <>
                            <li className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                              Aset
                            </li>
                            {repoHits.map((repo) => (
                              <ComboboxOption
                                key={repo.id}
                                value={{ type: 'repo', repo } satisfies SearchItem}
                                className={({ focus }) =>
                                  clsx(
                                    'flex cursor-default items-center rounded-md px-3 py-2.5 select-none',
                                    focus && 'bg-neutral-100 dark:bg-neutral-700'
                                  )
                                }
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                                    {repo.name}
                                  </p>
                                  <p className="truncate text-xs text-neutral-500">
                                    {repo.owner.username} · {repo.description}
                                  </p>
                                </div>
                              </ComboboxOption>
                            ))}
                          </>
                        )}
                        {compHits.length > 0 && (
                          <>
                            <li className="mt-2 px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                              Kompetisi
                            </li>
                            {compHits.map((comp) => (
                              <ComboboxOption
                                key={comp.slug}
                                value={{ type: 'competition', competition: comp } satisfies SearchItem}
                                className={({ focus }) =>
                                  clsx(
                                    'flex cursor-default items-center rounded-md px-3 py-2.5 select-none',
                                    focus && 'bg-neutral-100 dark:bg-neutral-700'
                                  )
                                }
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                                    {comp.title}
                                  </p>
                                  {comp.sponsor && (
                                    <p className="truncate text-xs text-neutral-500">{comp.sponsor}</p>
                                  )}
                                </div>
                              </ComboboxOption>
                            ))}
                          </>
                        )}
                        <ComboboxOption
                          value={{ type: 'view-all', name: '', icon: Search01Icon, uri: '' } satisfies SearchItem}
                          className={({ focus }) =>
                            clsx(
                              'mt-1 flex cursor-default items-center rounded-md px-3 py-2 select-none',
                              focus && 'bg-neutral-100 dark:bg-neutral-700'
                            )
                          }
                        >
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            Lihat semua hasil
                          </span>
                        </ComboboxOption>
                      </ul>
                    )}
                  </li>
                )}

                {trimmed.length < 2 && (
                  <li className="p-2">
                    <h2 className="mt-4 mb-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-300">
                      Pencarian populer
                    </h2>
                    <ul className="text-sm text-gray-700 dark:text-gray-300">
                      {recommendedSearches.map((item) => (
                        <ComboboxOption
                          key={item.name}
                          value={item}
                          className={({ focus }) =>
                            clsx(
                              'flex cursor-default items-center rounded-md px-3 py-2 select-none',
                              focus && 'bg-neutral-100 dark:bg-neutral-700'
                            )
                          }
                        >
                          {({ focus }) => (
                            <>
                              <HugeiconsIcon
                                icon={item.icon}
                                size={24}
                                className="h-6 w-6 flex-none text-neutral-400 dark:text-gray-300"
                              />
                              <span className="ms-3 flex-auto truncate">{item.name}</span>
                              {focus && (
                                <span className="ms-3 flex-none text-neutral-500 dark:text-gray-400">
                                  <ArrowUpRightIcon className="inline-block h-4 w-4" />
                                </span>
                              )}
                            </>
                          )}
                        </ComboboxOption>
                      ))}
                    </ul>
                  </li>
                )}

                <li className="p-2">
                  <h2 className="sr-only">Aksi cepat</h2>
                  <ul className="text-sm text-gray-700 dark:text-gray-300">
                    {quickActions.map((action) => (
                      <ComboboxOption
                        key={action.name}
                        value={action}
                        className={({ focus }) =>
                          clsx(
                            'flex cursor-default items-center rounded-md px-3 py-2 select-none',
                            focus && 'bg-neutral-100 dark:bg-neutral-700'
                          )
                        }
                      >
                        {({ focus }) => (
                          <>
                            <HugeiconsIcon
                              icon={action.icon}
                              size={24}
                              className="h-6 w-6 flex-none text-neutral-400 dark:text-gray-300"
                            />
                            <span className="ms-3 flex-auto truncate">{action.name}</span>
                            <span
                              className={clsx(
                                'ms-3 flex-none text-xs font-semibold text-neutral-400 dark:text-gray-300',
                                !focus && 'opacity-60'
                              )}
                            >
                              <ArrowUpRightIcon className="inline-block h-4 w-4" />
                            </span>
                          </>
                        )}
                      </ComboboxOption>
                    ))}
                  </ul>
                </li>
              </ComboboxOptions>
            </Combobox>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}

export default SearchModal
