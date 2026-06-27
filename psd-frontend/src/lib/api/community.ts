import {
  CreateReplyBodySchema,
  CreateThreadBodySchema,
  ForumEngagementResponseSchema,
  ForumStats,
  ForumStatsSchema,
  PaginatedThreadSummary,
  PaginatedThreadSummarySchema,
  Post,
  PostSchema,
  ThreadDetail,
  ThreadDetailSchema,
} from '@/types/api'
import { apiFetch, buildQuery } from './client'

export const FORUM_REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👏', '🔥', '💡'] as const

export const getForumStats = () => apiFetch<ForumStats>('/forum/stats', ForumStatsSchema)

export const getThreads = (
  q: { q?: string; tags?: string; sort?: string; page?: number; page_size?: number } = {}
) => apiFetch<PaginatedThreadSummary>(`/forum/threads${buildQuery(q)}`, PaginatedThreadSummarySchema)

export const getThread = (id: string) =>
  apiFetch<ThreadDetail>(`/forum/threads/${id}`, ThreadDetailSchema)

export const createThread = (body: { title: string; body_md: string; tags: string[] }) =>
  apiFetch<ThreadDetail>('/forum/threads', ThreadDetailSchema, {
    method: 'POST',
    body: JSON.stringify(CreateThreadBodySchema.parse(body)),
  })

export const replyToThread = (threadId: string, body_md: string) =>
  apiFetch<Post>(`/forum/threads/${threadId}/posts`, PostSchema, {
    method: 'POST',
    body: JSON.stringify(CreateReplyBodySchema.parse({ body_md })),
  })

export const getRepoDiscussions = (
  repoId: string,
  q: { page?: number; page_size?: number } = {}
) =>
  apiFetch<PaginatedThreadSummary>(`/repos/${repoId}/discussions${buildQuery(q)}`, PaginatedThreadSummarySchema)

export const createRepoDiscussion = (
  repoId: string,
  body: { title: string; body_md: string; tags: string[] }
) =>
  apiFetch<ThreadDetail>(`/repos/${repoId}/discussions`, ThreadDetailSchema, {
    method: 'POST',
    body: JSON.stringify(CreateThreadBodySchema.parse(body)),
  })

export const voteForumThread = (threadId: string, value: 1 | -1 | 0) =>
  apiFetch(`/forum/threads/${threadId}/vote`, ForumEngagementResponseSchema, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })

export const voteForumPost = (postId: string, value: 1 | -1 | 0) =>
  apiFetch(`/forum/posts/${postId}/vote`, ForumEngagementResponseSchema, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })

export const reactForumThread = (threadId: string, emoji: string) =>
  apiFetch(`/forum/threads/${threadId}/reactions`, ForumEngagementResponseSchema, {
    method: 'PUT',
    body: JSON.stringify({ emoji }),
  })

export const reactForumPost = (postId: string, emoji: string) =>
  apiFetch(`/forum/posts/${postId}/reactions`, ForumEngagementResponseSchema, {
    method: 'PUT',
    body: JSON.stringify({ emoji }),
  })
