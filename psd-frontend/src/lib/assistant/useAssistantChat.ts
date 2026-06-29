'use client'

import {
  deleteConversation,
  getAssistantPanel,
  getConversation,
  listConversations,
  newConversation,
  sendMessage,
  type AssistantConversation,
  type AssistantMessage,
  type AssistantPanel,
} from '@/lib/api/assistant'
import { ApiError } from '@/lib/api/client'
import { getApiErrorMessage } from '@/lib/api/errors'
import { useAuth } from '@/lib/auth/useAuth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  at: number
}

function toChatMessages(msgs: AssistantMessage[]): ChatMessage[] {
  const base = Date.now() - msgs.length * 1000
  return msgs
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m, i) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      at: base + i * 1000,
    }))
}

type Options = {
  /** Halaman penuh: refresh mulai chat baru */
  freshOnMount?: boolean
}

export function useAssistantChat(context: Record<string, string>, options: Options = {}) {
  const { freshOnMount = false } = options
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bootstrapped, setBootstrapped] = useState(false)

  const panel = useQuery({
    queryKey: ['assistant-panel'],
    queryFn: getAssistantPanel,
    enabled: isLoggedIn,
    refetchOnWindowFocus: true,
  })

  const conversations = useQuery({
    queryKey: ['assistant-conversations'],
    queryFn: listConversations,
    enabled: isLoggedIn,
  })

  useEffect(() => {
    const resetAt = panel.data?.quota.reset_at
    if (!resetAt) return
    const ms = new Date(resetAt).getTime() - Date.now()
    if (ms <= 0) {
      void panel.refetch()
      return
    }
    const t = window.setTimeout(() => void panel.refetch(), ms + 800)
    return () => window.clearTimeout(t)
  }, [panel.data?.quota.reset_at, panel])

  useEffect(() => {
    if (!isLoggedIn) {
      setBootstrapped(false)
      setActiveId(null)
      setMessages([])
      return
    }
    if (bootstrapped || conversations.isLoading) return

    let cancelled = false
    ;(async () => {
      try {
        if (freshOnMount) {
          const conv = await newConversation()
          if (cancelled) return
          setActiveId(conv.id)
          setMessages([])
          await qc.invalidateQueries({ queryKey: ['assistant-conversations'] })
        } else {
          const list = conversations.data ?? []
          if (list.length > 0) {
            const conv = list[0]
            const detail = await getConversation(conv.id)
            if (cancelled) return
            setActiveId(conv.id)
            setMessages(toChatMessages(detail.messages))
          } else {
            const conv = await newConversation()
            if (cancelled) return
            setActiveId(conv.id)
            setMessages([])
            await qc.invalidateQueries({ queryKey: ['assistant-conversations'] })
          }
        }
        setBootstrapped(true)
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e, 'Gagal memuat asisten.'))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoggedIn, bootstrapped, conversations.isLoading, conversations.data, freshOnMount, qc])

  const scrollToBottom = useCallback(() => {
    window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  const loadConversation = useCallback(
    async (conv: AssistantConversation) => {
      setError(null)
      setActiveId(conv.id)
      const detail = await getConversation(conv.id)
      setMessages(toChatMessages(detail.messages))
      scrollToBottom()
    },
    [scrollToBottom],
  )

  const startNewChat = useCallback(async () => {
    setError(null)
    const conv = await newConversation()
    setActiveId(conv.id)
    setMessages([])
    await qc.invalidateQueries({ queryKey: ['assistant-conversations'] })
  }, [qc])

  const removeConversation = useCallback(
    async (id: string) => {
      const wasActive = activeId === id
      await deleteConversation(id)
      await qc.invalidateQueries({ queryKey: ['assistant-conversations'] })
      const updated = await listConversations()
      qc.setQueryData(['assistant-conversations'], updated)
      if (wasActive) {
        if (updated.length > 0) {
          await loadConversation(updated[0])
        } else {
          await startNewChat()
        }
      }
    },
    [activeId, loadConversation, qc, startNewChat],
  )

  const sendMutation = useMutation({
    mutationFn: (content: string) => {
      if (!activeId) throw new Error('no_conversation')
      return sendMessage(activeId, content, context)
    },
    onMutate: (content) => {
      const now = Date.now()
      setMessages((prev) => [...prev, { role: 'user', content, at: now }])
      setQuestion('')
      setError(null)
      scrollToBottom()
    },
    onSuccess: (res, content) => {
      const now = Date.now()
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply, at: now + 1 }])
      if (res.panel) {
        qc.setQueryData<AssistantPanel>(['assistant-panel'], res.panel)
      } else {
        void panel.refetch()
      }
      void qc.invalidateQueries({ queryKey: ['assistant-conversations'] })
      scrollToBottom()
    },
    onError: (err: Error, content) => {
      setMessages((prev) => prev.filter((m) => !(m.role === 'user' && m.content === content)))
      if (err instanceof ApiError && (err.code === 'quota_exhausted' || err.status === 429)) {
        void panel.refetch()
        setError(err.message || 'Kuota chat habis. Coba lagi setelah jendela reset.')
      } else {
        setError(getApiErrorMessage(err, 'Gagal mengirim pertanyaan.'))
      }
    },
  })

  const handleSubmit = useCallback(
    (e?: { preventDefault?: () => void }) => {
      e?.preventDefault?.()
      const q = question.trim()
      if (!q || sendMutation.isPending || panel.data?.send_disabled || !activeId) return
      sendMutation.mutate(q)
    },
    [question, sendMutation, panel.data?.send_disabled, activeId],
  )

  return {
    isLoggedIn,
    question,
    setQuestion,
    messages,
    error,
    panel,
    conversations,
    activeId,
    sendMutation,
    handleSubmit,
    loadConversation,
    startNewChat,
    removeConversation,
    bottomRef,
    bootstrapped,
  }
}
