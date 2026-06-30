import {
  FeedStats,
  FeedStatsSchema,
  FollowResponseSchema,
  LikePostResponseSchema,
  PaginatedOwner,
  PaginatedOwnerSchema,
  PaginatedSocialComment,
  PaginatedSocialCommentSchema,
  PaginatedSocialPost,
  PaginatedSocialPostSchema,
  PostImageUploadSchema,
  SocialComment,
  SocialCommentSchema,
  SocialPost,
  SocialPostSchema,
} from '@/types/api'
import { apiFetch, apiFetchForm, apiDelete, buildQuery } from './client'

export const followUser = (username: string) =>
  apiFetch(`/users/${username}/follow`, FollowResponseSchema, { method: 'POST' })

export const unfollowUser = (username: string) =>
  apiFetch(`/users/${username}/follow`, FollowResponseSchema, { method: 'DELETE' })

export const removeFollower = (username: string, followerUsername: string) =>
  apiDelete(`/users/${username}/followers/${followerUsername}`)

export const getFollowers = (username: string, page = 1) =>
  apiFetch<PaginatedOwner>(
    `/users/${username}/followers${buildQuery({ page })}`,
    PaginatedOwnerSchema,
  )

export const getFollowing = (username: string, page = 1) =>
  apiFetch<PaginatedOwner>(
    `/users/${username}/following${buildQuery({ page })}`,
    PaginatedOwnerSchema,
  )

export const getFeedStats = () => apiFetch<FeedStats>('/feed/stats', FeedStatsSchema)

export const getFeed = (scope: 'following' | 'all' = 'following', page = 1) =>
  apiFetch<PaginatedSocialPost>(`/feed${buildQuery({ scope, page })}`, PaginatedSocialPostSchema)

export const getPost = (id: string) => apiFetch<SocialPost>(`/posts/${id}`, SocialPostSchema)

export const getUserPosts = (username: string, page = 1) =>
  apiFetch<PaginatedSocialPost>(
    `/users/${username}/posts${buildQuery({ page })}`,
    PaginatedSocialPostSchema,
  )

export const createPost = (body: {
  body_md: string
  images: string[]
  asset?: { kind: string; slug: string }
}) =>
  apiFetch<SocialPost>('/posts', SocialPostSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const deletePost = (id: string) => apiDelete(`/posts/${id}`)

export const updatePost = (
  id: string,
  body: { body_md?: string; visibility?: 'public' | 'private'; images?: string[] },
) =>
  apiFetch<SocialPost>(`/posts/${id}`, SocialPostSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const likePost = (id: string) =>
  apiFetch(`/posts/${id}/like`, LikePostResponseSchema, { method: 'POST' })

export const unlikePost = (id: string) =>
  apiFetch(`/posts/${id}/like`, LikePostResponseSchema, { method: 'DELETE' })

export const getComments = (id: string, page = 1, page_size = 20) =>
  apiFetch<PaginatedSocialComment>(
    `/posts/${id}/comments${buildQuery({ page, page_size })}`,
    PaginatedSocialCommentSchema,
  )

export const addComment = (id: string, body_md: string, parent_id?: string | null) =>
  apiFetch<SocialComment>(`/posts/${id}/comments`, SocialCommentSchema, {
    method: 'POST',
    body: JSON.stringify(parent_id ? { body_md, parent_id } : { body_md }),
  })

export const uploadPostImage = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return apiFetchForm('/posts/images', PostImageUploadSchema, fd)
}
