'use client'

import { assetKindPath, createAssetBranch, getAssetBranches } from '@/lib/api/asset'
import { isValidBranchName } from '@/lib/asset/branchName'
import { getApiErrorMessage } from '@/lib/api/errors'
import type { RepoKind } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'

type Props = {
  kind: RepoKind
  owner: string
  name: string
  ref: string
  onRefChange: (ref: string) => void
}

export function AssetBranchesTab({ kind, owner, name, ref, onRefChange }: Props) {
  const kp = assetKindPath(kind)
  const qc = useQueryClient()
  const [newName, setNewName] = useState('')
  const [fromBranch, setFromBranch] = useState(ref)
  const [error, setError] = useState<string | null>(null)

  const branches = useQuery({
    queryKey: ['asset-branches', kp, owner, name],
    queryFn: () => getAssetBranches(kp, owner, name),
  })

  const create = useMutation({
    mutationFn: () => createAssetBranch(kp, owner, name, newName.trim(), fromBranch),
    onSuccess: (row) => {
      setNewName('')
      setError(null)
      void qc.invalidateQueries({ queryKey: ['asset-branches', kp, owner, name] })
      onRefChange(row.name)
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Gagal membuat branch.')),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const n = newName.trim()
    if (!isValidBranchName(n)) {
      setError('Nama branch tidak valid (hindari spasi, .., ~, :, ?, *, awalan /).')
      return
    }
    create.mutate()
  }

  if (branches.isLoading) return <p className="text-sm text-neutral-500">Memuat branch…</p>

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Daftar branch</h3>
        <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200/80 dark:divide-neutral-800 dark:border-neutral-700">
          {(branches.data ?? []).map((b) => (
            <li key={b.name} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">{b.name}</p>
                {b.commit_sha && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{b.commit_sha.slice(0, 7)}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {b.is_default && (
                  <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
                    default
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRefChange(b.name)}
                  className="text-xs font-medium text-primary-700 hover:underline dark:text-primary-300"
                >
                  Checkout
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-dashed border-neutral-300 p-5 dark:border-neutral-600"
      >
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Buat branch baru</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-neutral-500">Nama branch</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="fitur-baru"
              className="mt-1 !rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">Dari branch</label>
            <select
              value={fromBranch}
              onChange={(e) => setFromBranch(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
            >
              {(branches.data ?? []).map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <ButtonPrimary type="submit" disabled={create.isPending || !newName.trim()}>
          Buat branch
        </ButtonPrimary>
      </form>
    </div>
  )
}
