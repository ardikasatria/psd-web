import type { ForumEngagement, ForumReactionSummary, ForumStats, ThreadDetail, ThreadSummary } from '@/types/api'
import { owners } from './users'

type ThreadRecord = ThreadSummary & {
  body_md: string
  repo_id?: string
}

type ReplyRecord = {
  id: string
  thread_id: string
  author: ThreadSummary['author']
  body_md: string
  created_at: string
}

const emptyEngagement = (): ForumEngagement => ({
  score: 0,
  upvotes: 0,
  downvotes: 0,
  user_vote: null,
  reactions: [],
})

type VoteKey = `${string}:${string}` // targetType:targetId

const voteStore = new Map<VoteKey, Map<string, 1 | -1>>()
const reactionStore = new Map<VoteKey, Map<string, Set<string>>>() // userId -> emojis

function voteKey(targetType: string, targetId: string) {
  return `${targetType}:${targetId}` as VoteKey
}

function computeEngagement(targetType: string, targetId: string, userId?: string): ForumEngagement {
  const key = voteKey(targetType, targetId)
  const votes = voteStore.get(key)
  let upvotes = 0
  let downvotes = 0
  let user_vote: 1 | -1 | null = null
  if (votes) {
    for (const [uid, value] of votes) {
      if (value === 1) upvotes++
      else downvotes++
      if (userId && uid === userId) user_vote = value
    }
  }

  const reacts = reactionStore.get(key)
  const emojiCounts = new Map<string, { count: number; reacted: boolean }>()
  if (reacts) {
    for (const [uid, emojis] of reacts) {
      for (const emoji of emojis) {
        const cur = emojiCounts.get(emoji) ?? { count: 0, reacted: false }
        cur.count++
        if (userId && uid === userId) cur.reacted = true
        emojiCounts.set(emoji, cur)
      }
    }
  }
  const reactions: ForumReactionSummary[] = [...emojiCounts.entries()]
    .map(([emoji, { count, reacted }]) => ({ emoji, count, reacted }))
    .sort((a, b) => b.count - a.count)

  return {
    score: upvotes - downvotes,
    upvotes,
    downvotes,
    user_vote,
    reactions,
  }
}

function withEngagement<T extends { id: string }>(targetType: string, item: T, userId?: string) {
  return { ...item, ...computeEngagement(targetType, item.id, userId) }
}

const threadRecords: ThreadRecord[] = [
  {
    id: 'thr_welcome',
    title: 'Selamat datang di forum PSD',
    author: owners.psd,
    tags: ['pengumuman', 'pemula'],
    replies: 2,
    created_at: '2026-06-01T08:00:00Z',
    last_activity_at: '2026-06-10T14:30:00Z',
    body_md: 'Selamat datang! Bagikan pertanyaan, proyek, dan tips seputar sains data Indonesia.',
    score: 0,
    upvotes: 0,
    downvotes: 0,
    user_vote: null,
    reactions: [],
  },
  {
    id: 'thr_01',
    title: 'Tips preprocessing teks Bahasa Indonesia',
    author: owners.budi,
    tags: ['nlp', 'tips'],
    replies: 2,
    created_at: '2026-06-05T10:00:00Z',
    last_activity_at: '2026-06-12T09:15:00Z',
    body_md: 'Apa workflow preprocessing yang kalian pakai untuk teks informal (slang, typo)?',
    score: 0,
    upvotes: 0,
    downvotes: 0,
    user_vote: null,
    reactions: [],
  },
  {
    id: 'thr_02',
    title: 'Diskusi dataset ulasan marketplace',
    author: owners.siti,
    tags: ['dataset', 'nlp'],
    replies: 0,
    created_at: '2026-06-08T11:00:00Z',
    last_activity_at: '2026-06-11T16:00:00Z',
    body_md: 'Ada yang sudah coba baseline dengan dataset **ulasan-marketplace-id**?',
    repo_id: 'ds_01',
    score: 0,
    upvotes: 0,
    downvotes: 0,
    user_vote: null,
    reactions: [],
  },
]

const replyRecords: ReplyRecord[] = [
  {
    id: 'post_w1',
    thread_id: 'thr_welcome',
    author: owners.budi,
    body_md: 'Terima kasih tim PSD! Senang bisa belajar di sini.',
    created_at: '2026-06-02T10:00:00Z',
  },
  {
    id: 'post_w2',
    thread_id: 'thr_welcome',
    author: owners.siti,
    body_md: 'Sama! Ekosistemnya lengkap untuk konteks Indonesia.',
    created_at: '2026-06-03T11:00:00Z',
  },
  {
    id: 'post_01',
    thread_id: 'thr_01',
    author: owners.siti,
    body_md: 'Saya biasanya normalisasi slang dulu pakai kamus custom, baru tokenisasi.',
    created_at: '2026-06-06T08:00:00Z',
  },
  {
    id: 'post_02',
    thread_id: 'thr_01',
    author: owners.budi,
    body_md: 'Setuju — plus hapus emoji berlebihan sebelum masuk model.',
    created_at: '2026-06-07T09:00:00Z',
  },
]

// Seed demo engagement
;(function seedEngagement() {
  const seedVotes: [string, string, string, 1 | -1][] = [
    ['thread', 'thr_welcome', 'usr_01', 1],
    ['thread', 'thr_welcome', 'usr_02', 1],
    ['thread', 'thr_01', 'usr_02', 1],
    ['post', 'post_01', 'usr_01', 1],
    ['post', 'post_01', 'usr_02', 1],
  ]
  for (const [tt, tid, uid, val] of seedVotes) {
    const key = voteKey(tt, tid)
    if (!voteStore.has(key)) voteStore.set(key, new Map())
    voteStore.get(key)!.set(uid, val)
  }
  const seedReactions: [string, string, string, string][] = [
    ['thread', 'thr_welcome', 'usr_01', '👍'],
    ['thread', 'thr_welcome', 'usr_02', '🎉'],
    ['post', 'post_01', 'usr_01', '🔥'],
  ]
  for (const [tt, tid, uid, emoji] of seedReactions) {
    const key = voteKey(tt, tid)
    if (!reactionStore.has(key)) reactionStore.set(key, new Map())
    const userMap = reactionStore.get(key)!
    if (!userMap.has(uid)) userMap.set(uid, new Set())
    userMap.get(uid)!.add(emoji)
  }
})()

function syncReplyCounts() {
  for (const t of threadRecords) {
    if (!t.repo_id) {
      t.replies = replyRecords.filter((r) => r.thread_id === t.id).length
    }
  }
}
syncReplyCounts()

function publicThreads(): ThreadRecord[] {
  return threadRecords.filter((t) => !t.repo_id)
}

export const threads: ThreadSummary[] = publicThreads().map(
  ({ id, title, author, tags, replies, created_at, last_activity_at }) => ({
    id,
    title,
    author,
    tags,
    replies,
    created_at,
    last_activity_at,
    ...emptyEngagement(),
  }),
)

export function threadDetailOf(thread: ThreadSummary & { body_md?: string }, userId?: string): ThreadDetail {
  const record = threadRecords.find((t) => t.id === thread.id)
  const body_md = thread.body_md ?? record?.body_md ?? ''
  const posts = replyRecords
    .filter((r) => r.thread_id === thread.id)
    .map((r) =>
      withEngagement('post', {
        id: r.id,
        author: r.author,
        body_md: r.body_md,
        created_at: r.created_at,
      }, userId),
    )
  const base = withEngagement(
    'thread',
    {
      id: thread.id,
      title: thread.title,
      author: thread.author,
      tags: thread.tags,
      replies: posts.length,
      created_at: thread.created_at,
      last_activity_at: thread.last_activity_at,
      body_md,
    },
    userId,
  )
  return { ...base, posts }
}

export function threadSummaryOf(thread: ThreadSummary, userId?: string): ThreadSummary {
  return withEngagement('thread', thread, userId)
}

export function findThread(id: string): ThreadRecord | undefined {
  return threadRecords.find((t) => t.id === id)
}

export function addThread(record: ThreadRecord) {
  threadRecords.unshift(record)
  threads.unshift({
    id: record.id,
    title: record.title,
    author: record.author,
    tags: record.tags,
    replies: 0,
    created_at: record.created_at,
    last_activity_at: record.last_activity_at,
    ...emptyEngagement(),
  })
}

export function addReply(threadId: string, reply: ReplyRecord) {
  replyRecords.push(reply)
  const t = threadRecords.find((x) => x.id === threadId)
  if (t) {
    t.replies += 1
    t.last_activity_at = reply.created_at
    const summary = threads.find((x) => x.id === threadId)
    if (summary) {
      summary.replies = t.replies
      summary.last_activity_at = t.last_activity_at
    }
  }
}

export function mockForumVote(
  targetType: string,
  targetId: string,
  userId: string,
  value: 1 | -1 | 0,
): ForumEngagement {
  const key = voteKey(targetType, targetId)
  if (!voteStore.has(key)) voteStore.set(key, new Map())
  const votes = voteStore.get(key)!
  if (value === 0) votes.delete(userId)
  else votes.set(userId, value)
  return computeEngagement(targetType, targetId, userId)
}

const ALLOWED = new Set(['👍', '❤️', '😂', '🎉', '🤔', '👏', '🔥', '💡'])

export function mockForumReaction(
  targetType: string,
  targetId: string,
  userId: string,
  emoji: string,
): ForumEngagement {
  if (!ALLOWED.has(emoji)) throw new Error('Emoji tidak didukung')
  const key = voteKey(targetType, targetId)
  if (!reactionStore.has(key)) reactionStore.set(key, new Map())
  const reacts = reactionStore.get(key)!
  if (!reacts.has(userId)) reacts.set(userId, new Set())
  const set = reacts.get(userId)!
  if (set.has(emoji)) set.delete(emoji)
  else set.add(emoji)
  return computeEngagement(targetType, targetId, userId)
}

export function buildForumStats(userId?: string): ForumStats {
  const publicList = publicThreads()
  const tagCounts: Record<string, number> = {}
  for (const t of publicList) {
    for (const tag of t.tags) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
  }
  const trending_tags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }))

  const activity: Record<string, number> = {}
  for (const t of publicList) activity[t.author.username] = (activity[t.author.username] ?? 0) + 2
  for (const r of replyRecords) activity[r.author.username] = (activity[r.author.username] ?? 0) + 1

  const people_of_week = Object.entries(activity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([username, score]) => ({
      user: [owners.psd, owners.budi, owners.siti].find((u) => u.username === username) ?? {
        username,
        type: 'user' as const,
        avatar_url: null,
      },
      score,
    }))

  return {
    total_threads: publicList.length,
    total_replies: replyRecords.filter((r) => publicList.some((t) => t.id === r.thread_id)).length,
    active_this_week: publicList.length,
    trending_tags,
    hot_threads: [...publicList]
      .sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at))
      .slice(0, 5)
      .map((t) => threadSummaryOf(t, userId)),
    people_of_week,
  }
}

export { threadRecords, replyRecords }
