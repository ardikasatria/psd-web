'use client'

import {
  commentPull,
  createPull,
  getPull,
  listPulls,
  mergePull,
  PullDetail,
  PullSummary,
  reviewPull,
} from '@/lib/api/contrib'
import { useAuth } from '@/lib/auth/useAuth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'

export function RepoPullRequestsPanel({
  repoId,
  isMaintainer,
  cloneUrl,
}: {
  repoId: string
  isMaintainer: boolean
  cloneUrl?: string | null
}) {
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [selected, setSelected] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [workBranch, setWorkBranch] = useState('')
  const [prBody, setPrBody] = useState('')
  const [comment, setComment] = useState('')

  const listKey = ['repo-pulls', repoId]
  const pulls = useQuery({
    queryKey: listKey,
    queryFn: () => listPulls(repoId),
    enabled: !!cloneUrl,
  })

  const detail = useQuery({
    queryKey: ['repo-pull', repoId, selected],
    queryFn: () => getPull(repoId, selected!),
    enabled: selected != null,
  })

  const create = useMutation({
    mutationFn: () => createPull(repoId, { title, work_branch: workBranch, body: prBody }),
    onSuccess: (res) => {
      setShowForm(false)
      setTitle('')
      setWorkBranch('')
      setPrBody('')
      qc.invalidateQueries({ queryKey: listKey })
      setSelected(res.number)
    },
  })

  const merge = useMutation({
    mutationFn: () => mergePull(repoId, selected!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey })
      qc.invalidateQueries({ queryKey: ['repo-pull', repoId, selected] })
    },
  })

  const review = useMutation({
    mutationFn: (event: 'APPROVE' | 'REQUEST_CHANGES') =>
      reviewPull(repoId, selected!, { event }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repo-pull', repoId, selected] }),
  })

  const postComment = useMutation({
    mutationFn: () => commentPull(repoId, selected!, comment),
    onSuccess: () => {
      setComment('')
      qc.invalidateQueries({ queryKey: ['repo-pull', repoId, selected] })
    },
  })

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    create.mutate()
  }

  if (!cloneUrl) {
    return (
      <p className="text-sm text-neutral-500">
        Repo belum terhubung ke Git. Kontribusi PR tersedia setelah provisioning Gitea (Langkah 50).
      </p>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Pull Request</h3>
          {isLoggedIn && (
            <Button type="button" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Batal' : 'Buat PR'}
            </Button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mb-4 space-y-3 rounded-xl border p-4">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul PR" required />
            <Input
              value={workBranch}
              onChange={(e) => setWorkBranch(e.target.value)}
              placeholder="Nama branch (mis. fitur-analisis)"
              required
            />
            <Textarea value={prBody} onChange={(e) => setPrBody(e.target.value)} placeholder="Deskripsi" rows={3} />
            <ButtonPrimary type="submit" disabled={create.isPending}>
              Ajukan kontribusi
            </ButtonPrimary>
          </form>
        )}

        {pulls.isLoading && <p className="text-sm text-neutral-500">Memuat…</p>}
        {pulls.data?.items.length === 0 && (
          <p className="text-sm text-neutral-500">Belum ada PR terbuka.</p>
        )}
        <ul className="space-y-2">
          {pulls.data?.items.map((pr: PullSummary) => (
            <li key={pr.number}>
              <button
                type="button"
                onClick={() => setSelected(pr.number)}
                className="w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <span className="font-medium">#{pr.number}</span> {pr.title}
                <span className="mt-1 block text-xs text-neutral-500">{pr.author ?? '—'}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {selected == null ? (
          <p className="text-sm text-neutral-500">Pilih PR untuk detail.</p>
        ) : detail.isLoading ? (
          <p className="text-sm text-neutral-500">Memuat detail…</p>
        ) : detail.data ? (
          <PullDetailPanel
            data={detail.data}
            isMaintainer={isMaintainer}
            comment={comment}
            setComment={setComment}
            onApprove={() => review.mutate('APPROVE')}
            onRequestChanges={() => review.mutate('REQUEST_CHANGES')}
            onMerge={() => merge.mutate()}
            onComment={() => postComment.mutate()}
            busy={merge.isPending || review.isPending || postComment.isPending}
          />
        ) : null}
      </div>
    </div>
  )
}

function PullDetailPanel({
  data,
  isMaintainer,
  comment,
  setComment,
  onApprove,
  onRequestChanges,
  onMerge,
  onComment,
  busy,
}: {
  data: PullDetail
  isMaintainer: boolean
  comment: string
  setComment: (v: string) => void
  onApprove: () => void
  onRequestChanges: () => void
  onMerge: () => void
  onComment: () => void
  busy: boolean
}) {
  return (
    <div className="rounded-xl border p-4">
      <h3 className="font-semibold">
        #{data.number} {data.title}
      </h3>
      <p className="mt-1 text-xs text-neutral-500">
        {data.author} · {data.head} → {data.base}
      </p>
      {data.body && <p className="mt-3 whitespace-pre-wrap text-sm">{data.body}</p>}
      <div className="mt-3 flex gap-3 text-xs text-neutral-600">
        <span>✓ {data.reviews.approved}</span>
        <span>⚠ {data.reviews.changes_requested}</span>
        <span>💬 {data.reviews.comments}</span>
      </div>
      {isMaintainer && !data.merged && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={onApprove} disabled={busy}>
            Approve
          </Button>
          <Button type="button" onClick={onRequestChanges} disabled={busy}>
            Request changes
          </Button>
          <ButtonPrimary type="button" onClick={onMerge} disabled={busy || !data.can_merge}>
            Merge
          </ButtonPrimary>
        </div>
      )}
      <div className="mt-4 space-y-2">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Komentar…"
          rows={2}
        />
        <Button type="button" onClick={onComment} disabled={busy || !comment.trim()}>
          Kirim komentar
        </Button>
      </div>
    </div>
  )
}
