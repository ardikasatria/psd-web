export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  at: number
}

const KEY_PREFIX = 'psd-assistant-chat'
const MAX_MESSAGES = 80

function storageKey(userId: string) {
  return `${KEY_PREFIX}:${userId}`
}

export function loadChatHistory(userId: string): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatMessage[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        typeof m.at === 'number',
    )
  } catch {
    return []
  }
}

export function saveChatHistory(userId: string, messages: ChatMessage[]) {
  if (typeof window === 'undefined') return
  try {
    const trimmed = messages.slice(-MAX_MESSAGES)
    localStorage.setItem(storageKey(userId), JSON.stringify(trimmed))
  } catch {
    /* quota penuh / private mode */
  }
}

export function clearChatHistory(userId: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    /* abaikan */
  }
}
