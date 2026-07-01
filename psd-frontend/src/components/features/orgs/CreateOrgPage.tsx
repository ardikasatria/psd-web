'use client'

import { createOrg } from '@/lib/api/orgs'
import { ORG_TYPES, orgTypeLabel, requiresVerification, validateHandle } from '@/lib/orgs/org-utils'
import { MY_ORGS_QUERY_KEY } from '@/components/features/orgs/MyOrgsPage'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

export function CreateOrgPage() {
  useAuthGuard('/orgs/new')
  const router = useRouter()
  const qc = useQueryClient()
  const [handle, setHandle] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<string>('community')
  const [error, setError] = useState<string | null>(null)

  const handleError = useMemo(() => (handle ? validateHandle(handle) : null), [handle])
  const needsVerifyInfo = requiresVerification(type)

  const create = useMutation({
    mutationFn: () => createOrg({ handle: handle.trim().toLowerCase(), name: name.trim(), type }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: MY_ORGS_QUERY_KEY })
      router.push(`/orgs/${res.handle}`)
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title="Buat organisasi"
        subtitle="Handle unik untuk URL publik. Anda bisa membuat banyak organisasi dari satu akun."
      />
      <form
        className="mx-auto max-w-lg space-y-5 rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800"
        onSubmit={(e) => {
          e.preventDefault()
          const hErr = validateHandle(handle)
          if (hErr) {
            setError(hErr)
            return
          }
          if (!name.trim()) {
            setError('Nama wajib diisi')
            return
          }
          setError(null)
          create.mutate()
        }}
      >
        <div>
          <label htmlFor="org-handle" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Handle
          </label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-neutral-500">psd.id/orgs/</span>
            <Input
              id="org-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              placeholder="umkm-batik-lampung"
              className="!rounded-xl flex-1"
            />
          </div>
          {handleError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{handleError}</p>}
        </div>
        <div>
          <label htmlFor="org-name" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Nama organisasi
          </label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="UMKM Batik Lampung"
            className="!rounded-xl"
          />
        </div>
        <div>
          <label htmlFor="org-type" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Tipe
          </label>
          <Select id="org-type" value={type} onChange={(e) => setType(e.target.value)} className="!rounded-xl">
            {ORG_TYPES.map((t) => (
              <option key={t} value={t}>
                {orgTypeLabel[t]}
              </option>
            ))}
          </Select>
        </div>
        {needsVerifyInfo && (
          <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <InformationCircleIcon className="size-5 shrink-0" />
            <p>
              Tipe {orgTypeLabel[type as keyof typeof orgTypeLabel]} perlu <strong>verifikasi KYC</strong> sebelum
              bisa memasang peluang rekrutmen talenta.
            </p>
          </div>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <ButtonPrimary type="submit" disabled={create.isPending || !!handleError}>
            {create.isPending ? 'Membuat…' : 'Buat organisasi'}
          </ButtonPrimary>
          <ButtonPrimary href="/me/orgs" outline type="button">
            Batal
          </ButtonPrimary>
        </div>
      </form>
    </FeaturePageShell>
  )
}
