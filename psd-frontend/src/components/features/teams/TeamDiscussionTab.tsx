'use client'

import { QueryState } from '@/components/features/QueryState'
import {
  createChannel,
  listChannels,
  listMessages,
  postMessage,
  presignTeamFile,
  registerTeamFile,
} from '@/lib/api/teams'
import { can, normalizeTeamRole } from '@/lib/teams/permissions'
import { teamCard, teamInput, teamText, teamTextMuted } from '@/lib/teams/team-ui'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { PaperClipIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

const BLOCKED_EXT = new Set(['exe', 'sh', 'bat', 'cmd', 'com', 'msi', 'scr', 'ps1', 'jar', 'app'])
const MAX_BYTES = 25 * 1024 * 1024

type Msg = {
  id: number
  body: string | null
  author: { username: string; name: string | null; avatar_url: string | null }
  created_at?: string | null
  files?: { id: string; filename: string; download_url?: string }[]
}

export function TeamDiscussionTab({ slug, myRole }: { slug: string; myRole: string | null | undefined }) {
  const role = normalizeTeamRole(myRole)
  const qc = useQueryClient()
  const [channelId, setChannelId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [newChannel, setNewChannel] = useState('')
  const [pendingFiles, setPendingFiles] = useState<{ id: string; filename: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const channelsQuery = useQuery({
    queryKey: ['team-channels', slug],
    queryFn: async () => (await listChannels(slug)).items,
  })

  useEffect(() => {
    if (!channelId && channelsQuery.data?.length) {
      setChannelId(channelsQuery.data[0].id)
    }
  }, [channelId, channelsQuery.data])

  const messagesQuery = useQuery({
    queryKey: ['team-messages', slug, channelId],
    queryFn: async () => (await listMessages(slug, channelId!, 1)).items as Msg[],
    enabled: !!channelId,
    refetchInterval: 15000,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesQuery.data])

  const createChMut = useMutation({
    mutationFn: (name: string) => createChannel(slug, name),
    onSuccess: (ch) => {
      setNewChannel('')
      qc.invalidateQueries({ queryKey: ['team-channels', slug] })
      setChannelId(ch.id)
    },
    onError: (e: Error) => setError(e.message),
  })

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!channelId) throw new Error('Pilih channel')
      return postMessage(slug, channelId, {
        body: text.trim() || undefined,
        file_ids: pendingFiles.map((f) => f.id),
      })
    },
    onSuccess: () => {
      setText('')
      setPendingFiles([])
      setError(null)
      qc.invalidateQueries({ queryKey: ['team-messages', slug, channelId] })
      qc.invalidateQueries({ queryKey: ['team-files', slug] })
    },
    onError: (e: Error) => setError(e.message),
  })

  const uploadFile = async (file: File) => {
    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
    if (BLOCKED_EXT.has(ext)) {
      setError(`Tipe berkas tidak diizinkan: .${ext}`)
      return
    }
    if (file.size <= 0) {
      setError('Berkas kosong.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Berkas melebihi batas 25 MB.')
      return
    }
    setError(null)
    const presign = await presignTeamFile(slug, file.name)
    const put = await fetch(presign.upload_url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    })
    if (!put.ok) throw new Error('Gagal mengunggah berkas')
    const registered = await registerTeamFile(slug, {
      filename: file.name,
      size_bytes: file.size,
      storage_key: presign.storage_key,
      channel_id: channelId ?? undefined,
    })
    setPendingFiles((prev) => [...prev, { id: registered.id, filename: registered.filename }])
  }

  const canPost = can(role, 'post_discussion')
  const canManageDiscussion = can(role, 'manage_discussion')
  const canSend = canPost && (text.trim().length > 0 || pendingFiles.length > 0)

  return (
    <div className="flex min-h-[420px] flex-col gap-4 lg:flex-row">
      <aside className={`w-full shrink-0 lg:w-52 ${teamCard} p-3`}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className={`text-xs font-semibold uppercase tracking-wide ${teamTextMuted}`}>Channel</h3>
          {canManageDiscussion && (
            <button
              type="button"
              className="text-primary-600 dark:text-primary-400"
              title="Buat channel"
              onClick={() => {
                const name = prompt('Nama channel baru:')
                if (name?.trim()) createChMut.mutate(name.trim())
              }}
            >
              <PlusIcon className="size-4" />
            </button>
          )}
        </div>
        <QueryState isLoading={channelsQuery.isLoading} isError={channelsQuery.isError} error={channelsQuery.error}>
          <ul className="space-y-1">
            {(channelsQuery.data ?? []).map((ch) => (
              <li key={ch.id}>
                <button
                  type="button"
                  onClick={() => setChannelId(ch.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    channelId === ch.id
                      ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                      : `${teamTextMuted} hover:bg-neutral-50 dark:hover:bg-neutral-700/50`
                  }`}
                >
                  # {ch.name}
                </button>
              </li>
            ))}
          </ul>
        </QueryState>
        {canManageDiscussion && newChannel === '' && (
          <p className={`mt-3 text-xs ${teamTextMuted}`}>Klik + untuk channel baru</p>
        )}
      </aside>

      <div className={`flex min-h-[360px] flex-1 flex-col ${teamCard}`}>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <QueryState
            isLoading={messagesQuery.isLoading}
            isError={messagesQuery.isError}
            error={messagesQuery.error}
            isEmpty={!messagesQuery.data?.length}
            emptyTitle="Belum ada pesan"
            emptyDescription="Mulai diskusi dengan mengirim pesan pertama."
          >
            {(messagesQuery.data ?? []).map((msg) => (
              <div key={msg.id} className="max-w-[85%]">
                <p className={`text-xs ${teamTextMuted}`}>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    {msg.author.name ?? msg.author.username}
                  </span>
                  {msg.created_at && (
                    <span className="ms-2">{new Date(msg.created_at).toLocaleString('id-ID')}</span>
                  )}
                </p>
                {msg.body && <p className={`mt-0.5 text-sm ${teamText}`}>{msg.body}</p>}
                {msg.files && msg.files.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {msg.files.map((f) => (
                      <li key={f.id}>
                        <a
                          href={f.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 underline dark:text-primary-400"
                        >
                          📎 {f.filename}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </QueryState>
        </div>

        {canPost && channelId && (
          <div className="border-t border-neutral-100 p-4 dark:border-neutral-700">
            {pendingFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pendingFiles.map((f) => (
                  <span
                    key={f.id}
                    className="rounded-lg bg-neutral-100 px-2 py-1 text-xs text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
                  >
                    {f.filename}
                  </span>
                ))}
              </div>
            )}
            {error && (
              <p className="mb-2 text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <label className="flex cursor-pointer items-center rounded-xl border border-neutral-200 px-3 py-2 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800">
                <PaperClipIcon className="size-5" />
                <input
                  type="file"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadFile(f).catch((err) => setError(err.message))
                    e.target.value = ''
                  }}
                />
              </label>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tulis pesan…"
                className={`!rounded-xl flex-1 ${teamInput}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && canSend) {
                    e.preventDefault()
                    sendMut.mutate()
                  }
                }}
              />
              <ButtonPrimary type="button" disabled={!canSend || sendMut.isPending} onClick={() => sendMut.mutate()}>
                Kirim
              </ButtonPrimary>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
