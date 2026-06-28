'use client'

import { listModelRegistries } from '@/lib/api/ml'
import { useAuth } from '@/lib/auth/useAuth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { BeakerIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

type Props = {
  repoId: string
  isOwner: boolean
}

export function RepoMlRegistryLink({ repoId, isOwner }: Props) {
  const { isLoggedIn } = useAuth()
  const registries = useQuery({
    queryKey: ['ml-registries'],
    queryFn: () => listModelRegistries({ page: 1 }),
    enabled: isLoggedIn && isOwner,
  })

  const registry = registries.data?.items.find((r) => r.repo_id === repoId)

  if (registry) {
    return (
      <ButtonPrimary href={`/ml/${registry.slug}`}>
        <BeakerIcon className="size-4" aria-hidden />
        Registry & monitoring
      </ButtonPrimary>
    )
  }

  if (isOwner) {
    return (
      <Button href={`/ml?repo_id=${encodeURIComponent(repoId)}`} outline>
        <BeakerIcon className="size-4" aria-hidden />
        Daftarkan ke Registry
      </Button>
    )
  }

  return (
    <Link
      href="/ml"
      className="inline-flex items-center gap-1.5 text-sm text-violet-700 hover:underline dark:text-violet-300"
    >
      <BeakerIcon className="size-4" aria-hidden />
      Registry Model
    </Link>
  )
}
