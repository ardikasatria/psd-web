'use client'

import { QueryState } from '@/components/features/QueryState'
import { search } from '@/lib/api/search'
import { registerSource } from '@/lib/api/factory'
import { hitToRepo } from '@/lib/search/hits'
import type { RepoSummary, SearchResult } from '@/types/api'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Input from '@/shared/Input'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
}

export function RegisterSourceDialog({ open, onClose }: Props) {
  const qc = useQueryClient()
  const [searchQ, setSearchQ] = useState('')
  const [error, setError] = useState<string | null>(null)

  const results = useQuery<SearchResult>({
    queryKey: ['search', 'factory-source', searchQ],
    queryFn: () => search(searchQ, 'repos'),
    enabled: searchQ.trim().length >= 2,
  })

  const mutation = useMutation({
    mutationFn: (slug: string) => registerSource(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factory-sources'] })
      setSearchQ('')
      setError(null)
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  function handleClose() {
    setSearchQ('')
    setError(null)
    onClose()
  }

  const datasets = (results.data?.repos ?? [])
    .map((hit: Record<string, unknown>) => hitToRepo(hit))
    .filter((r: RepoSummary) => r.kind === 'dataset')

  return (
    <Dialog open={open} onClose={handleClose} size="lg">
      <DialogTitle>Daftarkan dataset sebagai sumber</DialogTitle>
      <DialogBody className="space-y-4">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Cari dataset…"
            className="!ps-10"
          />
        </div>
        {datasets.length > 0 && (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {datasets.slice(0, 8).map((ds: RepoSummary) => (
              <li
                key={ds.slug}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{ds.name}</p>
                  <p className="truncate font-mono text-xs text-neutral-500">{ds.slug}</p>
                </div>
                <Button type="button" outline disabled={mutation.isPending} onClick={() => mutation.mutate(ds.slug)}>
                  Daftarkan
                </Button>
              </li>
            ))}
          </ul>
        )}
        {searchQ.trim().length >= 2 && datasets.length === 0 && !results.isLoading && (
          <p className="text-sm text-neutral-500">Tidak ada dataset yang cocok.</p>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </DialogBody>
      <DialogActions>
        <Button type="button" plain onClick={handleClose}>
          Tutup
        </Button>
      </DialogActions>
    </Dialog>
  )
}
