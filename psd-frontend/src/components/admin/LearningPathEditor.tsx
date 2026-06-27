'use client'

import { PATH_ITEM_TYPES, PATH_PHASES } from '@/lib/learning/pathItems'
import { getCompetitions } from '@/lib/api/competitions'
import { getCourses } from '@/lib/api/learn'
import { getEvents } from '@/lib/api/events'
import { getNotebooks } from '@/lib/api/notebooks'
import { listRooms } from '@/lib/api/rooms'
import { getRepos } from '@/lib/api/repos'
import type { PathItem, PathItemType, PathPhase } from '@/types/api'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { TrashIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

type Props = {
  slug: string
  title: string
  description: string
  items: PathItem[]
  onSlugChange: (v: string) => void
  onTitleChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onItemsChange: (items: PathItem[]) => void
  slugDisabled?: boolean
}

function useAssetOptions(type: PathItemType, q: string) {
  const search = q.trim()

  const courses = useQuery({
    queryKey: ['path-picker', 'course', search],
    queryFn: () => getCourses({ page_size: 30 }),
    enabled: type === 'course',
  })
  const datasets = useQuery({
    queryKey: ['path-picker', 'dataset', search],
    queryFn: () => getRepos('dataset', { page_size: 30, q: search || undefined }),
    enabled: type === 'dataset',
  })
  const models = useQuery({
    queryKey: ['path-picker', 'model', search],
    queryFn: () => getRepos('model', { page_size: 30, q: search || undefined }),
    enabled: type === 'model',
  })
  const projects = useQuery({
    queryKey: ['path-picker', 'project', search],
    queryFn: () => getRepos('project', { page_size: 30, q: search || undefined }),
    enabled: type === 'project',
  })
  const notebooks = useQuery({
    queryKey: ['path-picker', 'notebook', search],
    queryFn: () => getNotebooks({ page_size: 30, q: search || undefined }),
    enabled: type === 'notebook',
  })
  const rooms = useQuery({
    queryKey: ['path-picker', 'idea_room', search],
    queryFn: () => listRooms({ page_size: 30 }),
    enabled: type === 'idea_room',
  })
  const competitions = useQuery({
    queryKey: ['path-picker', 'competition', search],
    queryFn: () => getCompetitions({ page_size: 30 }),
    enabled: type === 'competition',
  })
  const events = useQuery({
    queryKey: ['path-picker', 'event', search],
    queryFn: () => getEvents({ page_size: 30 }),
    enabled: type === 'event',
  })

  return useMemo(() => {
    const filter = (label: string) => !search || label.toLowerCase().includes(search.toLowerCase())
    switch (type) {
      case 'course':
        return (courses.data?.items ?? [])
          .filter((c) => filter(c.title))
          .map((c) => ({ ref: c.slug, title: c.title }))
      case 'dataset':
        return (datasets.data?.items ?? [])
          .filter((r) => filter(r.name) || filter(r.slug))
          .map((r) => ({ ref: r.slug, title: r.name }))
      case 'model':
        return (models.data?.items ?? [])
          .filter((r) => filter(r.name) || filter(r.slug))
          .map((r) => ({ ref: r.slug, title: r.name }))
      case 'project':
        return (projects.data?.items ?? [])
          .filter((r) => filter(r.name) || filter(r.slug))
          .map((r) => ({ ref: r.slug, title: r.name }))
      case 'notebook':
        return (notebooks.data?.items ?? [])
          .filter((n) => filter(n.title))
          .map((n) => ({ ref: n.id, title: n.title }))
      case 'idea_room':
        return (rooms.data?.items ?? [])
          .filter((r) => filter(r.title))
          .map((r) => ({ ref: r.slug, title: r.title }))
      case 'competition':
        return (competitions.data?.items ?? [])
          .filter((c) => filter(c.title))
          .map((c) => ({ ref: c.slug, title: c.title }))
      case 'event':
        return (events.data?.items ?? [])
          .filter((e) => filter(e.title))
          .map((e) => ({ ref: e.slug, title: e.title }))
      default:
        return []
    }
  }, [type, search, courses.data, datasets.data, models.data, projects.data, notebooks.data, rooms.data, competitions.data, events.data])
}

function AddItemRow({ phase, onAdd }: { phase: PathPhase; onAdd: (item: PathItem) => void }) {
  const [type, setType] = useState<PathItemType>(
    PATH_ITEM_TYPES.find((t) => t.phase === phase)?.type ?? 'course',
  )
  const [search, setSearch] = useState('')
  const options = useAssetOptions(type, search)

  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 p-3 dark:border-neutral-600 dark:bg-neutral-800/40">
      <div className="flex flex-wrap gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as PathItemType)}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
        >
          {PATH_ITEM_TYPES.filter((t) => t.phase === phase).map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
        <Input
          placeholder="Cari aset…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="!rounded-lg !py-1.5 min-w-[10rem] flex-1 text-sm"
        />
      </div>
      <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto">
        {options.slice(0, 8).map((opt) => (
          <li key={`${type}-${opt.ref}`}>
            <button
              type="button"
              className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white dark:hover:bg-neutral-700"
              onClick={() => {
                onAdd({ phase, type, ref: opt.ref, title: opt.title })
                setSearch('')
              }}
            >
              <span className="font-medium text-neutral-800 dark:text-neutral-200">{opt.title}</span>
              <span className="ml-2 text-xs text-neutral-500">{opt.ref}</span>
            </button>
          </li>
        ))}
        {options.length === 0 && <li className="px-2 py-1 text-xs text-neutral-500">Tidak ada aset cocok.</li>}
      </ul>
    </div>
  )
}

export function LearningPathEditor({
  slug,
  title,
  description,
  items,
  onSlugChange,
  onTitleChange,
  onDescriptionChange,
  onItemsChange,
  slugDisabled,
}: Props) {
  const removeItem = (index: number) => onItemsChange(items.filter((_, i) => i !== index))

  const moveItem = (index: number, dir: -1 | 1) => {
    const next = [...items]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onItemsChange(next)
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-primary-200/60 bg-primary-50/40 p-4 dark:border-primary-900/40 dark:bg-primary-950/20">
        <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
          Lingkaran PSD: Belajar → Buktikan → Berpeluang
        </p>
        <p className="mt-1 text-xs text-primary-700/90 dark:text-primary-300/90">
          Kumpulkan aset dari katalog PSD ke dalam jalur terkurasi. Pembelajar mengikuti alur produktif dari
          fondasi hingga peluang nyata.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          placeholder="Slug (contoh: jalur-data-scientist)"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          required
          disabled={slugDisabled}
          className="!rounded-xl"
        />
        <Input
          placeholder="Judul jalur"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          required
          className="!rounded-xl"
        />
      </div>
      <Textarea
        placeholder="Deskripsi jalur — jelaskan tujuan dan siapa audiensnya"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        rows={3}
        className="!rounded-xl"
      />

      {PATH_PHASES.map((phase) => {
        const phaseItems = items.filter((i) => i.phase === phase.key)
        return (
          <section
            key={phase.key}
            className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="mb-4">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{phase.label}</h3>
              <p className="text-sm text-neutral-500">{phase.subtitle} · {phase.hint}</p>
            </div>
            {phaseItems.length === 0 ? (
              <p className="mb-3 text-sm text-neutral-400">Belum ada aset di fase ini.</p>
            ) : (
              <ol className="mb-3 space-y-2">
                {phaseItems.map((item, idx) => {
                  const globalIndex = items.indexOf(item)
                  return (
                    <li
                      key={`${item.type}-${item.ref}-${idx}`}
                      className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50/80 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/40"
                    >
                      <span className="text-xs font-medium uppercase text-neutral-400">{item.type.replace('_', ' ')}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {item.title ?? item.ref}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <Button type="button" outline className="!px-2 !py-1 !text-xs" onClick={() => moveItem(globalIndex, -1)}>
                          ↑
                        </Button>
                        <Button type="button" outline className="!px-2 !py-1 !text-xs" onClick={() => moveItem(globalIndex, 1)}>
                          ↓
                        </Button>
                        <button
                          type="button"
                          onClick={() => removeItem(globalIndex)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          aria-label="Hapus"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
            <AddItemRow
              phase={phase.key}
              onAdd={(item) => onItemsChange([...items, item])}
            />
          </section>
        )
      })}
    </div>
  )
}
