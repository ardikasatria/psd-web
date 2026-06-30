'use client'

import {
  commentPull,
  createPull,
  getPull,
  listPulls,
  PullDetail,
  PullSummary,
} from '@/lib/api/contrib'
import { useAuth } from '@/lib/auth/useAuth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { CodeBracketSquareIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FormEvent, useState } from 'react'

export function RepoContributePanel({
  repoId,
  ownerUsername,
}: {
  repoId: string
  ownerUsername: string
}) {
  const pathname = usePathname()
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [workBranch, setWorkBranch] = useState('')
  const [prBody, setPrBody] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [comment, setComment] = useState('')

  const listKey = ['repo-pulls', repoId]
  const pulls = useQuery({
    queryKey: listKey,
    queryFn: () => listPulls(repoId),
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
      setFormError(null)
      qc.invalidateQueries({ queryKey: listKey })
      setSelected(res.number)
    },
    onError: (e: Error) => setFormError(e.message || 'Gagal mengajukan pull request.'),
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
    setFormError(null)
    create.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary-200/80 bg-primary-50/40 p-4 dark:border-primary-900/50 dark:bg-primary-950/20">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <CodeBracketSquareIcon className="size-4 text-primary-500" aria-hidden />
          Ajukan kontribusi
        </h3>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          PSD membuat <strong>fork</strong> dan <strong>branch</strong> di Gitea untuk Anda. Clone repositori di atas,
          push commit ke branch yang sama, lalu ajukan pull request ke <strong>{ownerUsername}</strong>.
        </p>
        {!isLoggedIn ? (
          <ButtonPrimary href={`/login?next=${encodeURIComponent(pathname)}`} className="mt-4">
            Masuk untuk mengajukan PR
          </ButtonPrimary>
        ) : (
          <Button type="button" className="mt-4" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Batal' : 'Buat pull request'}
          </Button>
        )}
      </div>

      {showForm && isLoggedIn && (
        <form onSubmit={handleCreate} className="space-y-4 rounded-2xl border border-dashed border-neutral-300 p-5 dark:border-neutral-600">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul PR"
            required
            className="!rounded-xl"
          />
          <Input
            value={workBranch}
            onChange={(e) => setWorkBranch(e.target.value)}
            placeholder="Nama branch (mis. fitur-analisis)"
            required
            className="!rounded-xl"
          />
          <Textarea
            value={prBody}
            onChange={(e) => setPrBody(e.target.value)}
            placeholder="Deskripsi perubahan"
            rows={4}
            className="!rounded-xl"
          />
          <p className="text-xs text-neutral-500">
            Tip: push commit ke branch <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">{workBranch || '…'}</code>{' '}
            di fork Anda sebelum atau sesudah mengajukan PR.
          </p>
          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {formError}
            </p>
          )}
          <ButtonPrimary type="submit" disabled={create.isPending}>
            {create.isPending ? 'Mengajukan…' : 'Ajukan kontribusi'}
          </ButtonPrimary>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 text-sm font-semibold">Pull request terbuka</h3>
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
            <p className="text-sm text-neutral-500">Pilih PR untuk melihat detail.</p>
          ) : detail.isLoading ? (
            <p className="text-sm text-neutral-500">Memuat detail…</p>
          ) : detail.data ? (
            <ContributorPullDetail
              data={detail.data}
              comment={comment}
              setComment={setComment}
              onComment={() => postComment.mutate()}
              canComment={isLoggedIn}
              busy={postComment.isPending}
            />
          ) : null}
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        Workflow lanjutan via Git:{' '}
        <Link href="/help/git-clone-push" className="text-primary-600 hover:underline dark:text-primary-400">
          panduan Git push
        </Link>
        .
      </p>
    </div>
  )
}

function ContributorPullDetail({
  data,
  comment,
  setComment,
  onComment,
  canComment,
  busy,
}: {
  data: PullDetail
  comment: string
  setComment: (v: string) => void
  onComment: () => void
  canComment: boolean
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
      {data.merged && (
        <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">Sudah di-merge</p>
      )}
      {canComment && (
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
      )}
    </div>
  )
}
