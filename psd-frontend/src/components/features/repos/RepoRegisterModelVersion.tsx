'use client'

import { listModelRegistries, registerModelVersion } from '@/lib/api/ml'
import { useAuth } from '@/lib/auth/useAuth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { BeakerIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

type Props = {
  repoId: string
  isOwner: boolean
}

export function RepoRegisterModelVersion({ repoId, isOwner }: Props) {
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const registries = useQuery({
    queryKey: ['ml-registries'],
    queryFn: () => listModelRegistries({ page: 1 }),
    enabled: isLoggedIn && isOwner,
  })

  const registry = registries.data?.items.find((r) => r.repo_id === repoId)

  const register = useMutation({
    mutationFn: () => registerModelVersion(registry!.slug, { repo_id: repoId }),
    onSuccess: (ver) => {
      setError(null)
      setMessage(`Versi v${ver.version} terdaftar ke MLflow.`)
      qc.invalidateQueries({ queryKey: ['ml-registry', registry!.slug] })
      qc.invalidateQueries({ queryKey: ['ml-registries'] })
    },
    onError: (e: Error) => {
      setMessage(null)
      setError(e.message)
    },
  })

  if (!isOwner || !registry) return null

  return (
    <div className="flex flex-col items-start gap-2">
      <ButtonPrimary
        type="button"
        disabled={register.isPending}
        onClick={() => register.mutate()}
      >
        <BeakerIcon className="size-4" aria-hidden />
        {register.isPending ? 'Mendaftarkan…' : 'Daftarkan versi ke MLflow'}
      </ButtonPrimary>
      {message && <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
