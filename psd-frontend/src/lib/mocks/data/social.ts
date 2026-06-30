import type { FeedStats, OwnerRef, SocialComment, SocialPost } from '@/types/api'
import { owners, users } from './users'
import { repos } from './repos'

export const mockFollows: Record<string, Set<string>> = {
  [users[1].id]: new Set([users[0].id, users[2].id]),
  [users[2].id]: new Set([users[1].id]),
}

export const mockPosts: SocialPost[] = [
  {
    id: 'sps_01',
    author: owners.psd,
    body_md: 'Dataset **ulasan marketplace** baru dirilis — cocok untuk eksperimen NLP sentimen bahasa Indonesia.',
    images: [],
    asset: { kind: 'dataset', slug: 'psd/ulasan-marketplace-id' },
    like_count: 24,
    comment_count: 2,
    liked: false,
    visibility: 'public',
    created_at: '2026-06-25T08:00:00Z',
  },
  {
    id: 'sps_02',
    author: owners.budi,
    body_md: 'Baru selesai fine-tune model sentimen untuk UMKM. Hasilnya cukup menjanjikan di data Lampung! 🌱',
    images: ['https://picsum.photos/seed/post-budi-1/800/450'],
    asset: { kind: 'model', slug: 'budi-santoso/sentimen-umkm' },
    like_count: 12,
    comment_count: 1,
    liked: true,
    visibility: 'public',
    created_at: '2026-06-24T14:30:00Z',
  },
  {
    id: 'sps_03',
    author: owners.siti,
    body_md: 'Sedang eksperimen computer vision untuk deteksi hama padi. Siapa yang tertarik kolaborasi?',
    images: [
      'https://picsum.photos/seed/post-siti-1/600/400',
      'https://picsum.photos/seed/post-siti-2/600/400',
    ],
    asset: null,
    like_count: 8,
    comment_count: 0,
    liked: false,
    visibility: 'public',
    created_at: '2026-06-23T10:15:00Z',
  },
]

export function resolveMockCommentParent(
  items: SocialComment[],
  parentId?: string | null,
): { parent_id: string | null; reply_to?: SocialComment['author'] } {
  if (!parentId) return { parent_id: null }
  const parent = items.find((c) => c.id === parentId)
  if (!parent) throw new Error('not_found')
  if (parent.parent_id) {
    return { parent_id: parent.parent_id, reply_to: parent.author }
  }
  return { parent_id: parentId }
}

export const mockComments: Record<string, SocialComment[]> = {
  sps_01: [
    {
      id: 'spc_01',
      author: owners.budi,
      body_md: 'Terima kasih PSD! Langsung saya coba untuk pipeline preprocessing.',
      parent_id: null,
      created_at: '2026-06-25T09:00:00Z',
    },
    {
      id: 'spc_01_r1',
      author: owners.psd,
      body_md: 'Senang mendengarnya! Jangan ragu share hasilnya.',
      parent_id: 'spc_01',
      created_at: '2026-06-25T09:30:00Z',
    },
    {
      id: 'spc_02',
      author: owners.siti,
      body_md: 'Dataset ini berguna banget untuk tugas akhir saya.',
      parent_id: null,
      created_at: '2026-06-25T10:30:00Z',
    },
  ],
  sps_02: [
    {
      id: 'spc_03',
      author: owners.psd,
      body_md: 'Keren! Jangan lupa dokumentasikan hasil evaluasinya.',
      parent_id: null,
      created_at: '2026-06-24T16:00:00Z',
    },
  ],
}

export const mockPostLikes: Record<string, Set<string>> = {
  sps_02: new Set([users[0].id]),
}

export function followersOf(userId: string): OwnerRef[] {
  const result: OwnerRef[] = []
  for (const [followerId, following] of Object.entries(mockFollows)) {
    if (following.has(userId)) {
      const u = users.find((x) => x.id === followerId)
      if (u) {
        result.push({
          username: u.username,
          type: u.account_type === 'organization' ? 'org' : 'user',
          avatar_url: u.avatar_url,
          is_official: u.is_official,
        })
      }
    }
  }
  return result
}

export function followingOf(userId: string): OwnerRef[] {
  const following = mockFollows[userId] ?? new Set()
  return [...following]
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean)
    .map((u) => ({
      username: u!.username,
      type: u!.account_type === 'organization' ? 'org' : 'user',
      avatar_url: u!.avatar_url,
      is_official: u!.is_official,
    }))
}

export function isPostVisible(post: SocialPost, viewerUsername?: string): boolean {
  if ((post.visibility ?? 'public') === 'public') return true
  return Boolean(viewerUsername && post.author.username === viewerUsername)
}

export function feedForUser(userId: string, scope: 'following' | 'all', viewerUsername?: string): SocialPost[] {
  const visible = (posts: SocialPost[]) =>
    posts.filter((p) => isPostVisible(p, viewerUsername))
  if (scope === 'all') {
    return visible([...mockPosts]).sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  const following = mockFollows[userId] ?? new Set()
  const authorIds = new Set([...following, userId])
  return visible(
    mockPosts.filter((p) => {
      const author = users.find((u) => u.username === p.author.username)
      return author && authorIds.has(author.id)
    }),
  ).sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function postsByUsername(username: string, viewerUsername?: string): SocialPost[] {
  const items = mockPosts
    .filter((p) => p.author.username === username)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  if (viewerUsername === username) return items
  return items.filter((p) => isPostVisible(p, viewerUsername))
}

export function findRepoBySlug(slug: string) {
  return repos.find((r) => r.slug === slug)
}

export function buildFeedStats(viewerId?: string): FeedStats {
  const tagCounts: Record<string, number> = {}
  for (const post of mockPosts) {
    for (const match of post.body_md.matchAll(/#([\w-]+)/g)) {
      const tag = match[1].toLowerCase()
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
    }
  }
  const trending_tags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }))

  const activity: Record<string, number> = {}
  for (const post of mockPosts) {
    activity[post.author.username] = (activity[post.author.username] ?? 0) + 2
  }
  for (const comments of Object.values(mockComments)) {
    for (const c of comments) {
      activity[c.author.username] = (activity[c.author.username] ?? 0) + 1
    }
  }
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

  const hot_posts = [...mockPosts]
    .sort((a, b) => b.like_count - a.like_count || b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      author: p.author,
      preview: p.body_md.slice(0, 140),
      like_count: p.like_count,
      comment_count: p.comment_count,
      created_at: p.created_at,
    }))

  const following = viewerId ? (mockFollows[viewerId] ?? new Set()) : new Set<string>()
  const suggested_follows = viewerId
    ? users
        .filter((u) => u.id !== viewerId && !following.has(u.id))
        .map((u) => ({
          user: {
            username: u.username,
            type: (u.account_type === 'organization' ? 'org' : 'user') as 'user' | 'org',
            avatar_url: u.avatar_url,
            is_official: u.is_official,
          },
          followers: followersOf(u.id).length,
        }))
        .sort((a, b) => b.followers - a.followers)
        .slice(0, 5)
    : []

  return {
    total_posts: mockPosts.length,
    total_likes: mockPosts.reduce((sum, p) => sum + p.like_count, 0),
    active_this_week: mockPosts.length,
    trending_tags,
    hot_posts,
    people_of_week,
    suggested_follows,
  }
}
