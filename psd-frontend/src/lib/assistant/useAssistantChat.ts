'use client'

import { askAssistant, getAssistantQuota, type AskResult } from '@/lib/api/assistant'
import { getApiErrorMessage } from '@/lib/api/errors'
import { useAuth } from '@/lib/auth/useAuth'
import { clearChatHistory, loadChatHistory, saveChatHistory, type ChatMessage } from '@/lib/assistant/chatStorage'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

export function useAssistantChat(context: Record<string, string>) {
  const { user, isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      setMessages([])
      setHydrated(true)
      return
    }
    setMessages(loadChatHistory(user.id))
    setHydrated(true)
  }, [user?.id])

  useEffect(() => {
    if (!hydrated || !user?.id) return
    saveChatHistory(user.id, messages)
  }, [messages, user?.id, hydrated])

  const quota = useQuery({
    queryKey: ['assistant-quota'],
    queryFn: getAssistantQuota,
    enabled: isLoggedIn,
  })

  const scrollToBottom = useCallback(() => {
    window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  const askMutation = useMutation({
    mutationFn: (q: string) => askAssistant({ question: q, context }),
    onSuccess: (res: AskResult, q) => {
      setError(null)
      const now = Date.now()
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: q, at: now },
        { role: 'assistant', content: res.reply, at: now + 1 },
      ])
      setQuestion('')
      qc.setQueryData(['assistant-quota'], res.quota)
      scrollToBottom()
    },
    onError: (err: Error) => setError(getApiErrorMessage(err, 'Gagal mengirim pertanyaan.')),
  })

  const handleSubmit = useCallback(
    (e?: { preventDefault?: () => void }) => {
      e?.preventDefault?.()
      const q = question.trim()
      if (!q || askMutation.isPending) return
      askMutation.mutate(q)
    },
    [question, askMutation],
  )

  const clearHistory = useCallback(() => {
    if (!user?.id) return
    if (messages.length > 0 && !window.confirm('Hapus semua riwayat percakapan?')) return
    clearChatHistory(user.id)
    setMessages([])
    setError(null)
  }, [user?.id, messages.length])

  return {
    user,
    isLoggedIn,
    question,
    setQuestion,
    messages,
    error,
    quota,
    askMutation,
    handleSubmit,
    clearHistory,
    bottomRef,
    scrollToBottom,
    hydrated,
  }
}
