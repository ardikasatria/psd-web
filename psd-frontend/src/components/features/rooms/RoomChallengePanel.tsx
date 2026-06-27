'use client'

import { SyntheticBadge } from '@/components/common/SyntheticBadge'
import { challengeRoom, getProblem, getRoomAssets, publishAssets } from '@/lib/api/rooms'
import { IdeaRoom, RoomAsset } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { Field, Label } from '@/shared/fieldset'
import { ArrowTopRightOnSquareIcon, MegaphoneIcon, ShareIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function RoomChallengePanel({
  room,
  slug,
  isMaster,
}: {
  room: IdeaRoom
  slug: string
  isMaster: boolean
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [challengeTitle, setChallengeTitle] = useState('')
  const [sponsor, setSponsor] = useState('')
  const [metric, setMetric] = useState('')
  const [durationDays, setDurationDays] = useState('14')
  const [tags, setTags] = useState('')
  const [panelError, setPanelError] = useState<string | null>(null)

  const assetsQuery = useQuery({
    queryKey: ['idea-room-assets', slug],
    queryFn: async () => {
      const res = await getRoomAssets(slug)
      return res.items as RoomAsset[]
    },
    enabled: room.status === 'finished' || room.status === 'challenged',
  })

  const problemQuery = useQuery({
    queryKey: ['idea-room-problem', slug],
    queryFn: () => getProblem(slug),
    retry: false,
    enabled: isMaster && room.status === 'finished',
  })

  useEffect(() => {
    if (problemQuery.data?.suggested_metric && !metric) {
      setMetric(problemQuery.data.suggested_metric)
    }
    if (!challengeTitle && room.title) {
      setChallengeTitle(`Tantangan: ${room.title}`)
    }
  }, [problemQuery.data, room.title, metric, challengeTitle])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['idea-room', slug] })
    qc.invalidateQueries({ queryKey: ['idea-room-assets', slug] })
  }

  const publishMut = useMutation({
    mutationFn: () =>
      publishAssets(slug, {
        visibility,
        assets: (assetsQuery.data ?? [])
          .filter((a: RoomAsset) => selected.has(a.slug))
          .map((a: RoomAsset) => ({ type: a.type, slug: a.slug })),
      }),
    onSuccess: () => {
      setPanelError(null)
      invalidate()
    },
    onError: (e: Error) => setPanelError(e.message),
  })

  const challengeMut = useMutation({
    mutationFn: () =>
      challengeRoom(slug, {
        title: challengeTitle.trim() || undefined,
        sponsor: sponsor.trim() || undefined,
        metric: metric.trim() || undefined,
        duration_days: Number(durationDays) || 14,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    onSuccess: (res) => {
      setPanelError(null)
      invalidate()
      router.push(`/competitions/${res.competition_slug}`)
    },
    onError: (e: Error) => setPanelError(e.message),
  })

  const toggleAsset = (assetSlug: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(assetSlug)) next.delete(assetSlug)
      else next.add(assetSlug)
      return next
    })
  }

  if (room.status === 'challenged' && room.competition_slug) {
    return (
      <div className="space-y-4 rounded-2xl border border-rose-200/80 bg-rose-50/40 p-5 dark:border-rose-800/50 dark:bg-rose-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge color="rose">Ditantangkan</Badge>
            <p className="mt-2 text-sm text-rose-900 dark:text-rose-200">
              Ruang ini telah dijadikan kompetisi penantang. Komunitas dapat berkompetisi dengan dataset dan metrik
              dari ruang ini.
            </p>
          </div>
          <ButtonPrimary href={`/competitions/${room.competition_slug}`}>
            <ArrowTopRightOnSquareIcon className="size-4" aria-hidden />
            Lihat kompetisi
          </ButtonPrimary>
        </div>
        {isMaster && assetsQuery.data && assetsQuery.data.length > 0 && (
          <PublishAssetsSection
            assets={assetsQuery.data}
            selected={selected}
            toggleAsset={toggleAsset}
            visibility={visibility}
            setVisibility={setVisibility}
            onPublish={() => publishMut.mutate()}
            pending={publishMut.isPending}
          />
        )}
      </div>
    )
  }

  if (room.status !== 'finished' || !isMaster) return null

  const assets = assetsQuery.data ?? []

  return (
    <div className="space-y-6">
      {panelError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {panelError}
        </p>
      )}

      <section className="rounded-2xl border border-violet-200/80 bg-violet-50/30 p-5 dark:border-violet-800/50 dark:bg-violet-950/20">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
          <ShareIcon className="size-4" aria-hidden />
          Publikasikan aset
        </h3>
        {assets.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Belum ada aset dengan jejak ruang. Aset dataset dari generasi/upload otomatis tertaut; atau publikasikan
            saat menyelesaikan ruang.
          </p>
        ) : (
          <PublishAssetsSection
            assets={assets}
            selected={selected}
            toggleAsset={toggleAsset}
            visibility={visibility}
            setVisibility={setVisibility}
            onPublish={() => publishMut.mutate()}
            pending={publishMut.isPending}
          />
        )}
      </section>

      <section className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-5 dark:border-amber-800/50 dark:bg-amber-950/20">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
          <MegaphoneIcon className="size-4" aria-hidden />
          Jadikan tantangan kompetisi
        </h3>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          Buat kompetisi dari ruang ini — metrik dan dataset ruang akan menjadi acuan penantang.
        </p>
        <div className="space-y-4">
          <Field>
            <Label>Judul kompetisi</Label>
            <Input value={challengeTitle} onChange={(e) => setChallengeTitle(e.target.value)} className="!rounded-xl" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label>Metrik</Label>
              <Input value={metric} onChange={(e) => setMetric(e.target.value)} className="!rounded-xl" />
            </Field>
            <Field>
              <Label>Durasi (hari)</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="!rounded-xl"
              />
            </Field>
          </div>
          <Field>
            <Label>Sponsor (opsional)</Label>
            <Input value={sponsor} onChange={(e) => setSponsor(e.target.value)} className="!rounded-xl" />
          </Field>
          <Field>
            <Label>Tag (pisahkan koma)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="umkm, forecasting" className="!rounded-xl" />
          </Field>
          <ButtonPrimary type="button" disabled={challengeMut.isPending} onClick={() => challengeMut.mutate()}>
            {challengeMut.isPending ? 'Membuat…' : 'Buat kompetisi penantang'}
          </ButtonPrimary>
        </div>
      </section>
    </div>
  )
}

function PublishAssetsSection({
  assets,
  selected,
  toggleAsset,
  visibility,
  setVisibility,
  onPublish,
  pending,
}: {
  assets: RoomAsset[]
  selected: Set<string>
  toggleAsset: (slug: string) => void
  visibility: 'public' | 'private'
  setVisibility: (v: 'public' | 'private') => void
  onPublish: () => void
  pending: boolean
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">
        Data sintesis tetap berlabel — ingatkan audiens bahwa ini bukan data resmi instansi.
      </p>
      <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200/80 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-800">
        {assets.map((a) => (
          <li key={a.slug} className="flex items-center justify-between gap-3 px-4 py-3">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={selected.has(a.slug)}
                onChange={() => toggleAsset(a.slug)}
                className="rounded border-neutral-300"
              />
              <span className="min-w-0">
                <span className="text-xs uppercase text-neutral-500">{a.type}</span>
                <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {a.name}
                </span>
              </span>
            </label>
            <div className="flex shrink-0 items-center gap-2">
              {a.synthetic && <SyntheticBadge />}
              <Badge color={a.visibility === 'public' ? 'sky' : 'zinc'}>{a.visibility}</Badge>
            </div>
          </li>
        ))}
      </ul>
      <Field>
        <Label>Visibilitas setelah publikasi</Label>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
          className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="public">Publik</option>
          <option value="private">Privat</option>
        </select>
      </Field>
      <ButtonPrimary type="button" disabled={pending || selected.size === 0} onClick={onPublish}>
        {pending ? 'Mempublikasikan…' : `Publikasikan ${selected.size} aset`}
      </ButtonPrimary>
    </div>
  )
}
