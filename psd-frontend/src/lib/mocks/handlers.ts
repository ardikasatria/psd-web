import { countPhases } from '@/lib/learning/pathItems'
import type { PathItem } from '@/types/api'
import { http, HttpResponse } from 'msw'
import { mockCompetitionProposals, paginateProposals } from './data/competition-proposals'
import { competitions, detailOf as competitionDetailOf, getRemainingToday, leaderboardOf, recordSubmission, submissions, buildCompetitionStats, filterCompetitions, compNotebooks, compDetailStatsOf } from './data/competitions'
import { mockEventProposals, paginateEventProposals } from './data/event-proposals'
import { events, detailOf, eventRegistrations, buildMockIcs, buildEventStats, filterEvents } from './data/events'
import { courseDetailOf, courses, authoredCourses, completedLessons, enrollments, instructorApplications, learningPaths, learnersOf, myLearningOf, pathDetailOf, pathSummaryOf, pathItemsOf, setPathItems, mockCourseExtras, activeEnrollment } from './data/learn'
import { notebookDetailOf, findNotebook, notebookRecords, notebooks } from './data/notebooks'
import { addReply, addThread, buildForumStats, deleteReplyRecord, deleteThreadRecord, findReply, findThread, mockForumReaction, mockForumVote, repliesForThread, resolveMockReplyParent, threadDetailOf, threadSummaryOf, threads, updateReplyRecord, updateThreadRecord, visibleThreadsForViewer } from './data/forum'
import { mockCategoryDetail, mockCategories, slugifyCategoryName } from './data/categories'
import { mockJourneyNext, mockQuestCatalog, mockQuestStore } from './data/quests'
import { mockActivitySummary } from './data/activity'
import { mockAssistantAsk, mockAssistantPanel, mockAssistantQuota, mockDeleteConversation, mockGetConversation, mockListConversations, mockNewConversation, mockPersonalizedFeed, mockSendMessage } from './data/assistant'
import {
  getMockDailyMicro,
  isMicroComplete,
  markMicroComplete,
  mockMicroQuizAnswers,
  mockMicroStore,
  mockStreak,
} from './data/micro'
import { detailOf as repoDetailOf, findRepo, repos } from './data/repos'
import { mockSearchUserProfile } from './data/profile-search'
import {
  mockAssetBranches,
  mockAssetContributors,
  mockAssetFile,
  mockAssetReadme,
  mockAssetTree,
  mockAssetVersions,
  mockCreateBranch,
} from './data/asset-detail'
import {
  canViewMockProfile,
  getMockUserSettings,
  isMockUserSearchable,
  patchMockUserSettings,
} from './data/settings'
import { demoUser, userStats, users } from './data/users'
import {
  buildFeedStats,
  feedForUser,
  followersOf,
  followingOf,
  mockComments,
  mockFollows,
  mockPostLikes,
  mockPosts,
  postsByUsername,
  resolveMockCommentParent,
} from './data/social'
import { buildDiscoveryPanels, discoveryListForKind } from './data/discovery'
import { runUniversalSearch } from './data/search'
import { mockContributors, mockGamificationFor } from './data/gamification'
import {
  getMockAssetStats,
  getMockUserEngagement,
  mockDownload,
  mockShare,
  mockView,
  toggleMockLove,
} from './data/engagement'
import {
  getMockLikedPage,
  getMockLikedSummary,
  patchMockLikedItemVisibility,
  patchMockLikedListSettings,
  syncMockLikedOnLove,
} from './data/liked'
import { getMockArticle, listMockBlog, mockBlogPosts } from './data/blog'
import {
  mockAdminListReports,
  mockAdminReopenReport,
  mockAdminResolveReport,
  mockAdminStartReview,
  mockMyReports,
  mockReportContent,
} from './data/reports'
import {
  mockAdminListTickets,
  mockAdminTicketAction,
  mockCreateTicket,
  mockGetTicket,
  mockMyTickets,
  mockReplyTicket,
} from './data/support'
import { mockNotifications, notificationsForUser, unreadCountForUser } from './data/notifications'
import {
  findTeam,
  adminTeamOf,
  mockTeamChannels,
  mockTeamFiles,
  mockTeamInvites,
  mockTeamJoinRequests,
  mockTeamMembers,
  mockTeamMessages,
  mockTeams,
  myTeamsOf,
  normalizeMockRole,
  teamDetailOf,
  teamSummaryOf,
  userMembership,
} from './data/teams'
import {
  createMockJob,
  mockJobStatus,
  mockSynthJobs,
  mockSynthQuota,
} from './data/synthesis'
import {
  DEFAULT_SOLUTION_TEMPLATE,
  findMockRoom,
  mockRoomAssets,
  mockRoomComponents,
  mockRoomGeneratingAt,
  mockRoomProblems,
  mockRoomSubmissions,
  mockRoomTemplates,
  mockRooms,
  roomDetailForViewer,
  roomSummaryOf,
} from './data/rooms'
import {
  findMockCollection,
  mockCollectionDetail,
  mockCollections,
  mockTransformerHub,
  resolveMockCollectionItems,
} from './data/collections'
import {
  findMockPipeline,
  mockDataSources,
  mockPipelines,
  pipelineSummaryOf,
  pipelinesForUser,
  sourcesForUser,
} from './data/factory'
import {
  createMockRun,
  findMockRun,
  getRunsUsedToday,
  mockRunDetail,
  runsForPipeline,
} from './data/factory-runs'
import {
  dashboardSummaryOf,
  dashboardsForUser,
  findMockDashboard,
  mockDashboards,
  mockWidgetData,
} from './data/factory-dashboards'
import { DEFAULT_MAX_NODES, validatePipelineSpec } from '@/lib/factory/validate'
import type { CourseDetail, SocialComment, SocialPost } from '@/types/api'
import { isStaff, isSuperadmin } from '@/lib/auth/roles'

const API = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000') + '/api/v1'
const API_ROOT = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
const TOS_CURRENT = '2026-07'
const mockTosVersions = new Map<string, string>()
const mockMemberShareTokens = new Map<string, string>()

function mockMemberShareUrl(token: string) {
  const base = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000').replace(/\/$/, '')
  return `${base}/m/${token}`
}

const likeState: Record<string, { liked: boolean; likes: number }> = Object.fromEntries(
  repos.map((r) => [r.id, { liked: false, likes: r.likes }])
)

const repoFileState: Record<string, Array<{ path: string; size_bytes: number; type: string; url: string }>> = {}
const repoMetaState: Record<string, Partial<{ readme_md: string; description: string; tags: string[]; license: string | null; visibility: string }>> = {}

const repoTrashState: Record<string, { deleted_at: string; purge_at: string; days_until_purge: number }> = {}

function isRepoTrashed(id: string) {
  return id in repoTrashState
}

type MockAnnouncement = {
  id: string
  title: string
  body_md: string
  level: 'info' | 'penting'
  active: boolean
}

const announcements: MockAnnouncement[] = [
  {
    id: 'ann_01',
    title: 'Selamat datang di PSD',
    body_md: 'Jelajahi dataset, model, dan kompetisi berkonteks Indonesia. Lihat [panduan memulai](/help/panduan-memulai) untuk langkah pertama.',
    level: 'info',
    active: true,
  },
  {
    id: 'ann_02',
    title: 'Kompetisi UMKM Lampung dibuka',
    body_md: '**Prediksi Permintaan Produk UMKM** kini aktif — daftar sebelum 15 Juli 2026.',
    level: 'penting',
    active: true,
  },
]

function mockRepoDetail(repo: (typeof repos)[number]) {
  const base = repoDetailOf(repo)
  const files = repoFileState[repo.id] ?? base.files
  const meta = repoMetaState[repo.id] ?? {}
  const slug = repo.slug.replace('/', '-')
  return {
    ...base,
    ...meta,
    files,
    clone_url: `https://git.projeksainsdata.com/${repo.owner.username}/${slug}.git`,
    source_of_truth: 'gitea' as const,
    gitea_repo_id: 1,
  }
}

const adminUsers = users.map((u) => ({
  id: u.id,
  username: u.username,
  email: `${u.username}@psd.id`,
  name: u.name,
  role: u.role,
  is_active: true,
  created_at: u.created_at,
}))

const COOKIE_NAME = 'psd_token'

function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

function tokenFromRequest(request: Request): string | null {
  const cookie = getCookie(request, COOKIE_NAME)
  if (cookie) return cookie
  const auth = request.headers.get('Authorization')
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null
}

function userFromToken(token: string | null) {
  if (!token) return null
  if (token.includes('admin')) return users.find((u) => u.role === 'superadmin') ?? demoUser
  if (token.includes('moderator')) return users.find((u) => u.role === 'moderator') ?? demoUser
  return demoUser
}

function resolveUserFromRequest(request: Request) {
  return userFromToken(tokenFromRequest(request))
}

function resolveUserFromAuth(auth: string | null) {
  if (!auth?.startsWith('Bearer ')) return null
  return userFromToken(auth.slice(7))
}

function withAuthCookie(body: Record<string, unknown>, token: string) {
  return HttpResponse.json(body, {
    headers: { 'Set-Cookie': `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax` },
  })
}

function clearAuthCookieResponse(body: Record<string, unknown> = { ok: true }) {
  return HttpResponse.json(body, {
    headers: { 'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` },
  })
}

function paginate<T>(items: T[], page = 1, page_size = 20) {
  const start = (page - 1) * page_size
  return {
    items: items.slice(start, start + page_size),
    total: items.length,
    page,
    page_size,
  }
}

function filterByCategory<T extends { category?: { slug: string } | null; subcategory?: { slug: string } | null }>(
  items: T[],
  category?: string | null,
  subcategory?: string | null,
) {
  let out = items
  if (category) out = out.filter((i) => i.category?.slug === category)
  if (subcategory) out = out.filter((i) => i.subcategory?.slug === subcategory)
  return out
}

const mockCategoryStore = [...mockCategories]
const mockSubStore: Record<string, { slug: string; name: string }[]> = Object.fromEntries(
  mockCategories.map((c) => [c.slug, mockCategoryDetail(c.slug)?.subcategories ?? []]),
)

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status })
}

export const handlers = [
  // Auth
  http.post(`${API}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { username: string; email: string; name: string; accept_tos?: boolean }
    if (!body.accept_tos) {
      return errorResponse(400, 'tos_required', 'Anda harus menyetujui Ketentuan Layanan & Kebijakan Privasi')
    }
    const user = {
      id: `usr_${Date.now()}`,
      username: body.username,
      name: body.name,
      avatar_url: null,
      banner_url: null,
      accent_color: '#4572b7',
      pronouns: null,
      location: null,
      bio: null,
      about_md: null,
      status_emoji: null,
      status_text: null,
      links: [],
      role: 'member' as const,
      interests: [],
      onboarded: false,
      email_verified: false,
      created_at: new Date().toISOString(),
    }
    mockTosVersions.set(user.id, TOS_CURRENT)
    const token = 'mock_token_' + body.username
    return withAuthCookie({ user: { ...user, email: body.email }, token }, token)
  }),

  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string }
    const user = users.find((u) => body.email.includes(u.username)) ?? demoUser
    const token = 'mock_token_' + user.username
    return withAuthCookie(
      { user: { ...user, email: `${user.username}@psd.id` }, token },
      token
    )
  }),

  http.post(`${API}/auth/logout`, () => clearAuthCookieResponse()),

  http.get(`${API}/auth/me`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ user: null })
    }
    const g = mockGamificationFor(user.username)
    const accepted =
      mockTosVersions.get(user.id) ?? (user.username === 'humas-psd' ? '2025-01' : TOS_CURRENT)
    return HttpResponse.json({
      user: {
        ...user,
        email: `${user.username}@psd.id`,
        reputation: g.tier.reputation,
        tier: g.tier,
        badges: g.badges.filter((b) => b.earned).map((b) => b.id),
        accepted_tos_version: accepted,
        tos_current: TOS_CURRENT,
      },
    })
  }),

  http.post(`${API}/me/accept-tos`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) {
      return errorResponse(401, 'unauthorized', 'Sesi tidak valid. Silakan masuk kembali.')
    }
    mockTosVersions.set(user.id, TOS_CURRENT)
    return HttpResponse.json({ ok: true })
  }),

  http.post(`${API}/auth/change-password`, ({ request }) => {
    if (!resolveUserFromRequest(request)) {
      return errorResponse(401, 'unauthorized', 'Sesi tidak valid.')
    }
    return HttpResponse.json({ ok: true })
  }),

  http.post(`${API}/auth/forgot-password`, () => HttpResponse.json({ ok: true })),

  http.post(`${API}/auth/reset-password`, () => HttpResponse.json({ ok: true })),

  http.post(`${API}/auth/change-email`, ({ request }) => {
    if (!resolveUserFromRequest(request)) {
      return errorResponse(401, 'unauthorized', 'Sesi tidak valid.')
    }
    return HttpResponse.json({ ok: true })
  }),

  http.post(`${API}/auth/verify-email`, () => HttpResponse.json({ ok: true })),

  http.post(`${API}/auth/resend-verification`, ({ request }) => {
    if (!resolveUserFromRequest(request)) {
      return errorResponse(401, 'unauthorized', 'Sesi tidak valid.')
    }
    return HttpResponse.json({ ok: true })
  }),

  http.patch(`${API}/me`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) {
      return errorResponse(401, 'unauthorized', 'Sesi tidak valid.')
    }
    const body = (await request.json()) as Record<string, unknown>
    const idx = users.findIndex((u) => u.id === user.id)
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...body } as (typeof users)[number]
      return HttpResponse.json({ ...users[idx], email: `${users[idx].username}@psd.id` })
    }
    return HttpResponse.json({ ...user, ...body, email: `${user.username}@psd.id` })
  }),

  http.post(`${API}/me/avatar`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) {
      return errorResponse(401, 'unauthorized', 'Sesi tidak valid.')
    }
    const url = `https://picsum.photos/seed/${user.username}-avatar/256/256`
    const idx = users.findIndex((u) => u.id === user.id)
    if (idx >= 0) users[idx] = { ...users[idx], avatar_url: url }
    return HttpResponse.json({ avatar_url: url })
  }),

  http.post(`${API}/me/banner`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) {
      return errorResponse(401, 'unauthorized', 'Sesi tidak valid.')
    }
    const url = `https://picsum.photos/seed/${user.username}-banner/1200/400`
    const idx = users.findIndex((u) => u.id === user.id)
    if (idx >= 0) users[idx] = { ...users[idx], banner_url: url }
    return HttpResponse.json({ banner_url: url })
  }),

  // Users
  http.get(`${API}/users/:username`, ({ params, request }) => {
    const user = users.find((u) => u.username === params.username)
    if (!user) return errorResponse(404, 'not_found', 'Pengguna tidak ditemukan.')
    const viewer = resolveUserFromRequest(request)
    if (!canViewMockProfile(user.id, viewer?.id ?? null, viewer?.role)) {
      return errorResponse(403, 'private_profile', 'Profil ini privat')
    }
    const stats = userStats[user.username] ?? { projects: 0, datasets: 0, models: 0, followers: 0 }
    const settings = getMockUserSettings(user.id)
    const followers_count = followersOf(user.id).length
    const following_count = followingOf(user.id).length
    const is_following = viewer
      ? (mockFollows[viewer.id] ?? new Set()).has(user.id)
      : false
    const payload: Record<string, unknown> = {
      ...user,
      stats: { ...stats, followers: followers_count },
      engagement: getMockUserEngagement(user.username),
      followers_count,
      following_count,
      is_following,
      ...(() => {
        const g = mockGamificationFor(user.username)
        return { reputation: g.tier.reputation, tier: g.tier, badges: g.badges.filter((b) => b.earned).map((b) => b.id) }
      })(),
    }
    const isOwner = viewer?.id === user.id
    if (!isOwner && !settings.privacy.show_email) {
      delete payload.email
    }
    return HttpResponse.json(payload)
  }),

  http.get(`${API}/users/:username/portfolio`, ({ params, request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const kind = url.searchParams.get('kind')
    let items = repos.filter((r) => r.owner.username === params.username && !isRepoTrashed(r.id))
    if (kind) items = items.filter((r) => r.kind === kind)
    return HttpResponse.json(paginate(items, page))
  }),

  http.get(`${API}/users/:username/search`, ({ params, request }) => {
    const user = users.find((u) => u.username === params.username)
    if (!user) return errorResponse(404, 'not_found', 'Pengguna tidak ditemukan.')
    const viewer = resolveUserFromRequest(request)
    if (!canViewMockProfile(user.id, viewer?.id ?? null, viewer?.role)) {
      return errorResponse(403, 'private_profile', 'Profil ini privat')
    }
    const url = new URL(request.url)
    const q = url.searchParams.get('q') ?? ''
    const limit = Number(url.searchParams.get('limit') ?? 40)
    const items = mockSearchUserProfile(String(params.username), q, limit)
    return HttpResponse.json({ items, total: items.length, q: q.trim() })
  }),

  // Repos
  ...(['projects', 'datasets', 'models'] as const).map((kind) =>
    http.get(`${API}/${kind}`, ({ request }) => {
      const url = new URL(request.url)
      const q = url.searchParams.get('q')?.toLowerCase()
      const tags = url.searchParams.get('tags')?.split(',')
      const sort = url.searchParams.get('sort')
      const page = Number(url.searchParams.get('page') ?? 1)
      const page_size = Number(url.searchParams.get('page_size') ?? 20)
      const kindSingular = kind.slice(0, -1) as 'project' | 'dataset' | 'model'

      let items = repos.filter((r) => r.kind === kindSingular && !isRepoTrashed(r.id))
      if (q) items = items.filter((r) => r.name.includes(q) || r.description.toLowerCase().includes(q))
      if (tags?.length) items = items.filter((r) => tags.some((t) => r.tags.includes(t)))
      const teamSlug = url.searchParams.get('team')
      if (teamSlug) items = items.filter((r) => r.team?.slug === teamSlug)
      items = filterByCategory(items, url.searchParams.get('category'), url.searchParams.get('subcategory'))
      if (sort === '-updated_at') items = [...items].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      if (sort === '-downloads') items = [...items].sort((a, b) => b.downloads - a.downloads)
      if (sort === '-likes') items = [...items].sort((a, b) => b.likes - a.likes)
      if (sort === 'downloads') items = [...items].sort((a, b) => a.downloads - b.downloads)

      return HttpResponse.json(paginate(items, page, page_size))
    })
  ),

  ...(['projects', 'datasets', 'models'] as const).flatMap((kind) => [
    http.get(`${API}/${kind}/:owner/:name`, ({ params }) => {
      const kindSingular = kind.slice(0, -1)
      const repo = findRepo(kindSingular, String(params.owner), String(params.name))
      if (!repo || isRepoTrashed(repo.id)) return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
      const state = likeState[repo.id] ?? { liked: false, likes: repo.likes }
      return HttpResponse.json({ ...mockRepoDetail(repo), liked: state.liked, likes: state.likes })
    }),
    http.post(`${API}/${kind}`, async ({ request }) => {
      if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Anda harus masuk untuk membuat aset.')
      const body = (await request.json()) as {
        name: string
        description: string
        visibility: string
        tags: string[]
        readme_md?: string
        license?: string | null
        team_id?: string | null
      }
      const kindSingular = kind.slice(0, -1) as 'project' | 'dataset' | 'model'
      const id = `new_${Date.now()}`
      const team = body.team_id ? mockTeams.find((t) => t.id === body.team_id) : undefined
      const repo = {
        id,
        slug: `${demoUser.username}/${body.name}`,
        kind: kindSingular,
        owner: { username: demoUser.username, type: 'user' as const, avatar_url: null },
        name: body.name,
        description: body.description,
        tags: body.tags,
        likes: 0,
        downloads: 0,
        visibility: body.visibility as 'public' | 'private',
        updated_at: new Date().toISOString(),
        team: team ? { slug: team.slug, name: team.name } : null,
      }
      repos.push(repo as (typeof repos)[number])
      if (body.readme_md || body.license) {
        repoMetaState[id] = { readme_md: body.readme_md ?? '', license: body.license ?? null }
      }
      return HttpResponse.json({ ...mockRepoDetail(repo as (typeof repos)[number]), liked: false })
    }),
  ]),

  ...(['projects', 'datasets', 'models'] as const).flatMap((kind) => [
    http.get(`${API}/${kind}/:owner/:name/readme`, ({ params }) => {
      const kindSingular = kind.slice(0, -1)
      try {
        return HttpResponse.json(mockAssetReadme(kindSingular, String(params.owner), String(params.name)))
      } catch {
        return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
      }
    }),
    http.get(`${API}/${kind}/:owner/:name/tree`, ({ params }) => {
      const kindSingular = kind.slice(0, -1)
      try {
        return HttpResponse.json(mockAssetTree(kindSingular, String(params.owner), String(params.name)))
      } catch {
        return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
      }
    }),
    http.get(`${API}/${kind}/:owner/:name/file`, ({ params, request }) => {
      const kindSingular = kind.slice(0, -1)
      const path = new URL(request.url).searchParams.get('path')
      if (!path) return errorResponse(422, 'invalid', 'Parameter path wajib.')
      try {
        return HttpResponse.json(
          mockAssetFile(kindSingular, String(params.owner), String(params.name), path),
        )
      } catch {
        return errorResponse(404, 'not_found', 'Berkas tidak ditemukan.')
      }
    }),
    http.get(`${API}/${kind}/:owner/:name/branches`, ({ params }) => {
      const kindSingular = kind.slice(0, -1)
      try {
        return HttpResponse.json(mockAssetBranches(kindSingular, String(params.owner), String(params.name)))
      } catch {
        return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
      }
    }),
    http.post(`${API}/${kind}/:owner/:name/branches`, async ({ params, request }) => {
      const kindSingular = kind.slice(0, -1)
      const body = (await request.json()) as { name?: string; from?: string }
      try {
        return HttpResponse.json(
          mockCreateBranch(
            kindSingular,
            String(params.owner),
            String(params.name),
            body.name ?? '',
            body.from ?? 'main',
          ),
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        if (msg === 'invalid_branch') return errorResponse(422, 'invalid_branch', 'Nama branch tidak valid.')
        return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
      }
    }),
    http.get(`${API}/${kind}/:owner/:name/versions`, ({ params }) => {
      const kindSingular = kind.slice(0, -1)
      try {
        return HttpResponse.json(mockAssetVersions(kindSingular, String(params.owner), String(params.name)))
      } catch {
        return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
      }
    }),
    http.get(`${API}/${kind}/:owner/:name/contributors`, ({ params }) => {
      const kindSingular = kind.slice(0, -1)
      try {
        return HttpResponse.json(mockAssetContributors(kindSingular, String(params.owner), String(params.name)))
      } catch {
        return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
      }
    }),
  ]),

  http.post(`${API}/repos/:repoId/like`, ({ request, params }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Anda harus masuk untuk menyukai aset.')
    const repo = repos.find((r) => r.id === params.repoId)
    if (!repo) return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
    const current = likeState[repo.id] ?? { liked: false, likes: repo.likes }
    likeState[repo.id] = { liked: true, likes: current.liked ? current.likes : current.likes + 1 }
    return HttpResponse.json(likeState[repo.id])
  }),

  http.delete(`${API}/repos/:repoId/like`, ({ request, params }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Anda harus masuk untuk menyukai aset.')
    const repo = repos.find((r) => r.id === params.repoId)
    if (!repo) return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
    const current = likeState[repo.id] ?? { liked: false, likes: repo.likes }
    likeState[repo.id] = { liked: false, likes: current.liked ? Math.max(0, current.likes - 1) : current.likes }
    return HttpResponse.json(likeState[repo.id])
  }),

  http.patch(`${API}/repos/:repoId`, async ({ request, params }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Sesi tidak valid.')
    const repo = repos.find((r) => r.id === params.repoId)
    if (!repo) return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
    const body = (await request.json()) as Record<string, unknown>
    repoMetaState[repo.id] = { ...repoMetaState[repo.id], ...body } as typeof repoMetaState[string]
    return HttpResponse.json({ ...mockRepoDetail(repo), liked: likeState[repo.id]?.liked ?? false })
  }),

  http.get(`${API}/me/repos/trash`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Sesi tidak valid.')
    const url = new URL(request.url)
    const kind = url.searchParams.get('kind')
    const page = Number(url.searchParams.get('page') ?? 1)
    let items = repos.filter((r) => r.owner.username === user.username && isRepoTrashed(r.id))
    if (kind) items = items.filter((r) => r.kind === kind)
    const mapped = items.map((r) => ({ ...r, ...repoTrashState[r.id] }))
    return HttpResponse.json(paginate(mapped, page))
  }),

  http.delete(`${API}/repos/:repoId`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Sesi tidak valid.')
    const repo = repos.find((r) => r.id === params.repoId)
    if (!repo) return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
    if (isRepoTrashed(repo.id)) return errorResponse(409, 'already_trashed', 'Aset sudah ada di trash.')
    const deleted_at = new Date().toISOString()
    const purge = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    repoTrashState[repo.id] = { deleted_at, purge_at: purge, days_until_purge: 30 }
    return HttpResponse.json({ trashed: true, ...repoTrashState[repo.id] })
  }),

  http.post(`${API}/repos/:repoId/restore`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Sesi tidak valid.')
    const repo = repos.find((r) => r.id === params.repoId)
    if (!repo) return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
    if (!isRepoTrashed(repo.id)) return errorResponse(409, 'not_trashed', 'Aset tidak berada di trash.')
    delete repoTrashState[repo.id]
    return HttpResponse.json({ restored: true, id: repo.id, slug: repo.slug })
  }),

  http.delete(`${API}/repos/:repoId/permanent`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Sesi tidak valid.')
    const repo = repos.find((r) => r.id === params.repoId)
    if (!repo) return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
    if (!isRepoTrashed(repo.id)) return errorResponse(400, 'not_trashed', 'Hapus ke trash terlebih dahulu.')
    delete repoTrashState[repo.id]
    const idx = repos.findIndex((r) => r.id === repo.id)
    if (idx >= 0) repos.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/repos/:repoId/files`, async ({ request, params }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Sesi tidak valid.')
    const repo = repos.find((r) => r.id === params.repoId)
    if (!repo) return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) return errorResponse(400, 'bad_request', 'File wajib diisi.')
    const entry = {
      path: file.name,
      size_bytes: file.size,
      type: file.type || 'application/octet-stream',
      url: `https://example.com/mock/${repo.slug}/${file.name}`,
    }
    const current = repoFileState[repo.id] ?? mockRepoDetail(repo).files
    repoFileState[repo.id] = [...current.filter((f) => f.path !== entry.path), entry]
    return HttpResponse.json(entry, { status: 201 })
  }),

  http.delete(`${API}/repos/:repoId/files`, ({ request, params }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Sesi tidak valid.')
    const repo = repos.find((r) => r.id === params.repoId)
    if (!repo) return errorResponse(404, 'not_found', 'Aset tidak ditemukan.')
    const path = new URL(request.url).searchParams.get('path') ?? ''
    const current = repoFileState[repo.id] ?? mockRepoDetail(repo).files
    repoFileState[repo.id] = current.filter((f) => f.path !== path)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/repos/:repoId/discussions`, ({ params, request }) => {
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    const items = threads.filter((t) => (t as { repo_id?: string }).repo_id === params.repoId)
    return HttpResponse.json(paginate(items, page))
  }),

  http.post(`${API}/repos/:repoId/discussions`, async ({ request, params }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Anda harus masuk untuk membuat diskusi.')
    const body = (await request.json()) as { title: string; body_md: string; tags: string[] }
    const thread = {
      id: `thr_${Date.now()}`,
      title: body.title,
      author: { username: demoUser.username, type: 'user' as const, avatar_url: null },
      tags: body.tags,
      replies: 0,
      created_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    }
    return HttpResponse.json(threadDetailOf(thread))
  }),

  // Notebooks
  http.get(`${API}/notebooks`, ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.toLowerCase()
    const page = Number(url.searchParams.get('page') ?? 1)
    let items = notebooks
    if (q) {
      items = items.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.description_preview?.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    items = filterByCategory(items, url.searchParams.get('category'), url.searchParams.get('subcategory'))
    const teamSlug = url.searchParams.get('team')
    if (teamSlug) items = items.filter((n) => n.team?.slug === teamSlug)
    return HttpResponse.json(paginate(items, page))
  }),

  http.get(`${API}/notebooks/:id`, ({ params }) => {
    const nb = findNotebook(String(params.id))
    if (!nb) return errorResponse(404, 'not_found', 'Notebook tidak ditemukan.')
    return HttpResponse.json(notebookDetailOf(nb))
  }),

  http.post(`${API}/notebooks`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const body = (await request.json()) as {
      title: string
      description: string
      tags: string[]
      source_url: string
      team_id?: string | null
    }
    const team = body.team_id ? mockTeams.find((t) => t.id === body.team_id) : undefined
    const record = {
      id: `nb_${Date.now()}`,
      title: body.title,
      owner: { username: user.username, type: 'user' as const, avatar_url: user.avatar_url, is_official: user.is_official },
      tags: body.tags,
      description: body.description,
      source_url: body.source_url || null,
      owner_id: user.id,
      team: team ? { slug: team.slug, name: team.name } : null,
    }
    notebookRecords.unshift(record)
    return HttpResponse.json(notebookDetailOf(record), { status: 201 })
  }),

  http.patch(`${API}/notebooks/:id`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const nb = findNotebook(String(params.id))
    if (!nb) return errorResponse(404, 'not_found', 'Notebook tidak ditemukan.')
    if (nb.owner_id !== user.id && !isStaff(user)) {
      return errorResponse(403, 'forbidden', 'Bukan pemilik notebook')
    }
    const body = (await request.json()) as Partial<{
      title: string
      description: string
      tags: string[]
      source_url: string | null
    }>
    Object.assign(nb, body)
    return HttpResponse.json(notebookDetailOf(nb))
  }),

  http.delete(`${API}/notebooks/:id`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const idx = notebookRecords.findIndex((n) => n.id === params.id)
    if (idx === -1) return new HttpResponse(null, { status: 204 })
    const nb = notebookRecords[idx]
    if (nb.owner_id !== user.id && !isStaff(user)) {
      return errorResponse(403, 'forbidden', 'Bukan pemilik notebook')
    }
    notebookRecords.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/notebooks/:id/content`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const nb = findNotebook(String(params.id))
    if (!nb) return errorResponse(404, 'not_found', 'Notebook tidak ditemukan.')
    return HttpResponse.json({
      id: nb.id,
      content: {
       nbformat: 4,
        nbformat_minor: 5,
        metadata: {},
        cells: [
          { cell_type: 'markdown', metadata: {}, source: [`# ${nb.title}\n`, '\n', 'Selamat datang di workspace notebook PSD.'] },
          { cell_type: 'code', metadata: {}, source: ['print("Hello from PSD notebook")'], outputs: [], execution_count: null },
        ],
      },
    })
  }),

  http.put(`${API}/notebooks/:id/content`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const nb = findNotebook(String(params.id))
    if (!nb) return errorResponse(404, 'not_found', 'Notebook tidak ditemukan.')
    await request.json()
    return HttpResponse.json({ id: String(params.id), saved: true })
  }),

  http.post(`${API}/notebooks/:id/launch`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const body = (await request.json().catch(() => ({}))) as { runtime?: string }
    const nb = findNotebook(String(params.id))
    if (!nb) return errorResponse(404, 'not_found', 'Notebook tidak ditemukan.')
    if (body.runtime === 'server') {
      const hubBase = process.env.NEXT_PUBLIC_HUB_URL || 'https://hub.psd.example'
      return HttpResponse.json({
        notebook_id: String(params.id),
        runtime: 'server',
        provider: 'jupyterhub',
        base_url: `${hubBase}/user/${user.username}`,
        kernels_url: `${hubBase}/user/${user.username}/api/kernels`,
        ws_base: `${hubBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')}/user/${user.username}`,
        token: 'mock-hub-scoped-token',
        expires_in: 3600,
      })
    }
    return HttpResponse.json({
      notebook_id: String(params.id),
      runtime: 'browser',
      config: {
        runtime: 'browser',
        engine: 'jupyterlite-pyodide',
        packages: ['numpy', 'pandas'],
        api_base: 'http://localhost:8000/api/v1',
        sdk: 'psd',
        max_notebooks: 10,
        gpu: 0,
      },
    })
  }),

  http.post(`${API}/notebooks/:id/stop`, ({ request }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    return HttpResponse.json({ stopped: true })
  }),

  http.get(`${API}/notebooks/runtime/status`, ({ request }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    return HttpResponse.json({ ready: true, pending: null })
  }),

  // Courses & paths
  http.get(`${API}/courses`, ({ request }) => {
    const url = new URL(request.url)
    const level = url.searchParams.get('level')
    const page = Number(url.searchParams.get('page') ?? 1)
    let items = courses.filter((c) => c.status === 'published')
    if (level) items = items.filter((c) => c.level === level)
    items = filterByCategory(items, url.searchParams.get('category'), url.searchParams.get('subcategory'))
    return HttpResponse.json(paginate(items, page))
  }),

  http.get(`${API}/courses/:slug`, ({ params, request }) => {
    const user = resolveUserFromRequest(request)
    const all = [...courses, ...authoredCourses]
    const course = all.find((c) => c.slug === params.slug)
    if (!course) return errorResponse(404, 'not_found', 'Kursus tidak ditemukan.')
    if (course.status !== 'published') {
      const isOwner = user && course.author?.username === user.username
      if (!isOwner && !isStaff(user)) {
        return errorResponse(404, 'not_found', 'Kursus tidak ditemukan.')
      }
    }
    const reveal = !!(user && (course.author?.username === user.username || isStaff(user)))
    return HttpResponse.json(courseDetailOf(course, user?.username, reveal))
  }),

  http.post(`${API}/courses`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || (!user.is_instructor && !isStaff(user))) {
      return errorResponse(403, 'forbidden', 'Khusus instruktur')
    }
    const body = (await request.json()) as {
      slug: string
      title: string
      level?: string
      description?: string
      modules?: CourseDetail['modules']
    }
    const all = [...courses, ...authoredCourses]
    if (all.some((c) => c.slug === body.slug)) {
      return errorResponse(409, 'exists', 'Slug course sudah dipakai')
    }
    const newCourse = {
      slug: body.slug,
      title: body.title,
      level: (body.level ?? 'pemula') as 'pemula' | 'menengah' | 'mahir',
      lessons_count: body.modules?.flatMap((m) => m.lessons).length ?? 0,
      cover_url: null,
      status: 'draft' as const,
      author: { username: user.username, type: 'user' as const, avatar_url: user.avatar_url },
    }
    authoredCourses.push(newCourse)
    mockCourseExtras[body.slug] = {
      description: body.description ?? '',
      modules: body.modules ?? [],
    }
    return HttpResponse.json({ slug: body.slug }, { status: 201 })
  }),

  http.patch(`${API}/courses/:slug`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const body = (await request.json()) as {
      status?: string
      title?: string
      level?: string
      description?: string
      requirements_md?: string | null
      modules?: CourseDetail['modules']
    }
    const all = [...courses, ...authoredCourses]
    const course = all.find((c) => c.slug === params.slug)
    if (!course) return errorResponse(404, 'not_found', 'Course tidak ditemukan')
    if (course.author?.username !== user.username && !isStaff(user)) {
      return errorResponse(403, 'forbidden', 'Bukan pemilik course')
    }
    if (course.status === 'pending_review' && !isStaff(user)) {
      return errorResponse(409, 'locked', 'Course sedang ditinjau, tidak bisa diubah')
    }
    if (body.status && !isStaff(user)) {
      delete body.status
    }
    if (body.title) course.title = body.title
    if (body.level) course.level = body.level as typeof course.level
    const extraPatch: typeof mockCourseExtras[string] = { ...mockCourseExtras[params.slug as string] }
    if (body.description !== undefined) extraPatch.description = body.description
    if (body.requirements_md !== undefined) extraPatch.requirements_md = body.requirements_md
    if (body.modules) {
      extraPatch.modules = body.modules
      course.lessons_count = body.modules.flatMap((m) => m.lessons).length
    }
    if ((body as { access_type?: string }).access_type) {
      extraPatch.access_type = (body as { access_type: 'lifetime' | 'limited' }).access_type
    }
    if ((body as { access_days?: number | null }).access_days !== undefined) {
      extraPatch.access_days = (body as { access_days: number | null }).access_days
    }
    if (
      body.description !== undefined ||
      body.modules ||
      body.requirements_md !== undefined ||
      (body as { access_type?: string }).access_type ||
      (body as { access_days?: number | null }).access_days !== undefined
    ) {
      mockCourseExtras[params.slug as string] = extraPatch
    }
    if (isStaff(user) && (body.status === 'published' || body.status === 'draft')) {
      course.status = body.status
    }
    return HttpResponse.json({ slug: course.slug })
  }),

  http.post(`${API}/courses/:slug/submit-review`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const all = [...courses, ...authoredCourses]
    const course = all.find((c) => c.slug === params.slug)
    if (!course) return errorResponse(404, 'not_found', 'Course tidak ditemukan')
    if (course.author?.username !== user.username && !isStaff(user)) {
      return errorResponse(403, 'forbidden', 'Bukan pemilik course')
    }
    if (course.status !== 'draft' && course.status !== 'rejected') {
      return errorResponse(400, 'invalid_state', 'Hanya draft/ditolak yang bisa diajukan')
    }
    course.status = 'pending_review'
    course.review_note = null
    return HttpResponse.json({ status: course.status })
  }),

  http.get(`${API}/me/courses/authored`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || (!user.is_instructor && !isStaff(user))) {
      return errorResponse(403, 'forbidden', 'Khusus instruktur')
    }
    const mine = [...courses, ...authoredCourses].filter(
      (c) => c.author?.username === user.username || isStaff(user),
    )
    return HttpResponse.json(mine)
  }),

  http.get(`${API}/admin/courses/review-queue`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const pending = [...courses, ...authoredCourses]
      .filter((c) => c.status === 'pending_review')
      .map((c) => ({
        slug: c.slug,
        title: c.title,
        level: c.level,
        author: c.author ?? null,
      }))
    return HttpResponse.json(paginate(pending, page))
  }),

  http.patch(`${API}/admin/courses/:slug/review`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const body = (await request.json()) as { decision: 'publish' | 'reject'; note?: string }
    const all = [...courses, ...authoredCourses]
    const course = all.find((c) => c.slug === params.slug)
    if (!course) return errorResponse(404, 'not_found', 'Course tidak ditemukan')
    if (body.decision === 'publish') {
      course.status = 'published'
      course.review_note = null
      mockCourseExtras[params.slug as string] = {
        ...mockCourseExtras[params.slug as string],
        publisher: { username: 'psd', type: 'org', avatar_url: null, is_official: true },
      }
      if (!courses.some((c) => c.slug === course.slug)) {
        courses.push({ ...course })
      }
    } else {
      course.status = 'rejected'
      course.review_note = body.note ?? ''
    }
    return HttpResponse.json({ status: course.status })
  }),

  http.post(`${API}/courses/:slug/materials`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const all = [...courses, ...authoredCourses]
    const course = all.find((c) => c.slug === params.slug)
    if (!course) return errorResponse(404, 'not_found', 'Course tidak ditemukan')
    if (course.author?.username !== user.username && !isStaff(user)) {
      return errorResponse(403, 'forbidden', 'Bukan pemilik course')
    }
    const form = await request.formData()
    const file = form.get('file')
    const name = file instanceof File ? file.name : 'materi.pdf'
    const size = file instanceof File ? file.size : 1024
    const type = file instanceof File ? file.type : 'application/octet-stream'
    return HttpResponse.json(
      {
        name,
        url: `https://example.com/courses/${params.slug}/${encodeURIComponent(name)}`,
        size_bytes: size,
        type: type || 'application/octet-stream',
      },
      { status: 201 }
    )
  }),

  http.post(`${API}/courses/:slug/lessons/:lessonId/quiz/submit`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const enr = activeEnrollment(user.username, params.slug as string)
    if (!enr || enr === 'expired') {
      return errorResponse(403, 'not_enrolled', 'Daftar dulu untuk mengerjakan quiz')
    }
    const all = [...courses, ...authoredCourses]
    const course = all.find((c) => c.slug === params.slug)
    if (!course) return errorResponse(404, 'not_found', 'Course tidak ditemukan')
    const detail = courseDetailOf(course, user.username, true)
    const lesson = detail.modules.flatMap((m) => m.lessons).find((l) => l.id === params.lessonId)
    if (!lesson?.quiz?.length) return errorResponse(404, 'not_found', 'Quiz tidak ditemukan')
    const body = (await request.json()) as { answers: number[] }
    const quiz = lesson.quiz
    const correct = quiz.reduce((s, q, i) => s + (q.answer_index === body.answers[i] ? 1 : 0), 0)
    const total = quiz.length
    const score = total ? Math.round((correct / total) * 100) : 0
    const passed = score >= 60
    if (passed) completedLessons.add(`${user.username}:${params.slug}:${params.lessonId}`)
    return HttpResponse.json({
      score,
      correct,
      total,
      passed,
      review: quiz.map((q) => ({
        id: q.id,
        correct_index: q.answer_index,
        explanation: q.explanation ?? null,
      })),
    })
  }),

  http.post(`${API}/courses/:slug/enroll`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const course = courses.find((c) => c.slug === params.slug && c.status === 'published')
    if (!course) return errorResponse(404, 'not_found', 'Course tidak ditemukan')
    const slug = params.slug as string
    const extra = mockCourseExtras[slug]
    const access_type = extra?.access_type ?? (slug === 'forecasting-umkm' ? 'limited' : 'lifetime')
    const access_days = extra?.access_days ?? (access_type === 'limited' ? 30 : null)
    let expires_at: string | null = null
    if (access_type === 'limited' && access_days) {
      expires_at = new Date(Date.now() + access_days * 86_400_000).toISOString()
    }
    const key = `${user.username}:${slug}`
    const existing = enrollments.get(key)
    if (existing) {
      enrollments.set(key, { ...existing, expires_at })
    } else {
      enrollments.set(key, { expires_at, enrolled_at: new Date().toISOString() })
    }
    return HttpResponse.json({ enrolled: true, expires_at }, { status: 201 })
  }),

  http.get(`${API}/courses/:slug/learners`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const all = [...courses, ...authoredCourses]
    const course = all.find((c) => c.slug === params.slug)
    if (!course) return errorResponse(404, 'not_found', 'Course tidak ditemukan')
    if (course.author?.username !== user.username && !isStaff(user)) {
      return errorResponse(403, 'forbidden', 'Bukan pemilik course')
    }
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    return HttpResponse.json(learnersOf(params.slug as string, page))
  }),

  http.post(`${API}/courses/:slug/lessons/:lessonId/complete`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    completedLessons.add(`${user.username}:${params.slug}:${params.lessonId}`)
    return HttpResponse.json({ ok: true })
  }),

  http.get(`${API}/me/learning`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    return HttpResponse.json(myLearningOf(user.username))
  }),

  http.post(`${API}/me/instructor-application`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const existing = instructorApplications.find(
      (a) => a.userId === user.id && (a.status === 'pending' || a.status === 'approved'),
    )
    if (existing) return errorResponse(409, 'exists', 'Anda sudah mengajukan atau sudah menjadi instruktur')
    const body = (await request.json()) as { expertise: string; motivation_md?: string }
    instructorApplications.push({
      userId: user.id,
      expertise: body.expertise,
      motivation_md: body.motivation_md ?? '',
      status: 'pending',
    })
    return HttpResponse.json({ id: `ins_${Date.now()}`, status: 'pending' }, { status: 201 })
  }),

  http.get(`${API}/me/instructor-application`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const app = instructorApplications.find((a) => a.userId === user.id)
    if (!app) return HttpResponse.json(null)
    return HttpResponse.json({ status: app.status, expertise: app.expertise })
  }),

  http.get(`${API}/admin/instructor-applications`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const page = Number(url.searchParams.get('page') ?? 1)
    let items = instructorApplications.map((a, i) => {
      const u = users.find((x) => x.id === a.userId)
      return {
        id: `ins_${i}`,
        expertise: a.expertise,
        motivation_md: a.motivation_md,
        status: a.status,
        user: { username: u?.username ?? 'unknown', name: u?.name ?? 'Unknown' },
      }
    })
    if (status) items = items.filter((a) => a.status === status)
    return HttpResponse.json(paginate(items, page))
  }),

  http.patch(`${API}/admin/instructor-applications/:id`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const body = (await request.json()) as { status: 'approved' | 'rejected' }
    const idx = Number(String(params.id).replace('ins_', ''))
    const app = instructorApplications[idx]
    if (!app) return errorResponse(404, 'not_found', 'Pengajuan tidak ditemukan')
    app.status = body.status
    if (body.status === 'approved') {
      const u = users.find((x) => x.id === app.userId)
      if (u) u.is_instructor = true
    }
    return HttpResponse.json({ status: app.status })
  }),

  http.get(`${API}/me/git/info`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    return HttpResponse.json({
      enabled: true,
      git_host: 'git.projeksainsdata.com',
      git_base_url: 'https://git.projeksainsdata.com',
      ssh_user: 'git',
      gitea_username: user.username,
      ssh_port: 22,
      github_like: true,
      ssh_clone_example: `git@git.projeksainsdata.com:${user.username}/nama-repo.git`,
      ssh_clone_prefix: `git@git.projeksainsdata.com:${user.username}/`,
      ssh_test_command: 'ssh -T git@git.projeksainsdata.com',
      ssh_config_snippet: `Host git.projeksainsdata.com
  HostName git.projeksainsdata.com
  User git
  IdentityFile ~/.ssh/id_ed25519`,
    })
  }),

  http.get(`${API}/me/git/ssh-keys`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    return HttpResponse.json({ items: [] })
  }),

  http.post(`${API}/me/git/ssh-keys`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const body = (await request.json()) as { title: string; key: string }
    return HttpResponse.json(
      {
        id: Date.now(),
        title: body.title,
        fingerprint: 'SHA256:mock',
        key_type: body.key.split(' ')[0] || 'ssh-ed25519',
        created_at: new Date().toISOString(),
      },
      { status: 201 },
    )
  }),

  http.delete(`${API}/me/git/ssh-keys/:id`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/learning-paths`, ({ request }) => {
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    return HttpResponse.json(paginate(learningPaths.map(pathSummaryOf), page))
  }),

  http.get(`${API}/learning-paths/:slug`, ({ params }) => {
    const path = learningPaths.find((p) => p.slug === params.slug)
    if (!path) return errorResponse(404, 'not_found', 'Jalur belajar tidak ditemukan.')
    return HttpResponse.json(pathDetailOf(path))
  }),

  // Forum
  http.get(`${API}/forum/stats`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    return HttpResponse.json(buildForumStats(user?.id))
  }),

  http.get(`${API}/forum/threads`, ({ request }) => {
    const url = new URL(request.url)
    const user = resolveUserFromRequest(request)
    const q = url.searchParams.get('q')?.toLowerCase()
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) ?? []
    const sort = url.searchParams.get('sort')
    const page = Number(url.searchParams.get('page') ?? 1)
    let items = visibleThreadsForViewer(user?.username).map((t) => threadSummaryOf(t, user?.id))
    if (q) items = items.filter((t) => t.title.toLowerCase().includes(q))
    if (tags.length) items = items.filter((t) => tags.some((tag) => t.tags.includes(tag)))
    if (sort === 'top') items = [...items].sort((a, b) => b.score - a.score || b.last_activity_at.localeCompare(a.last_activity_at))
    return HttpResponse.json(paginate(items, page))
  }),

  http.get(`${API}/forum/threads/:id`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    const thread = threads.find((t) => t.id === params.id)
    if (!thread) return errorResponse(404, 'not_found', 'Utas tidak ditemukan.')
    try {
      return HttpResponse.json(threadDetailOf(thread, user?.id, user?.username))
    } catch {
      return errorResponse(404, 'not_found', 'Utas tidak ditemukan.')
    }
  }),

  http.post(`${API}/forum/threads`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk untuk membuat utas.')
    const body = (await request.json()) as { title: string; body_md: string; tags: string[] }
    const now = new Date().toISOString()
    const thread = {
      id: `thr_${Date.now()}`,
      title: body.title,
      author: {
        username: user.username,
        type: (user.account_type === 'organization' ? 'org' : 'user') as 'user' | 'org',
        avatar_url: user.avatar_url,
        is_official: user.is_official,
      },
      tags: body.tags,
      replies: 0,
      created_at: now,
      last_activity_at: now,
      body_md: body.body_md,
    }
    addThread(thread)
    return HttpResponse.json(threadDetailOf(thread, user.id), { status: 201 })
  }),

  http.put(`${API}/forum/threads/:id/vote`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const thread = threads.find((t) => t.id === params.id)
    if (!thread) return errorResponse(404, 'not_found', 'Utas tidak ditemukan.')
    const body = (await request.json()) as { value: 1 | -1 | 0 }
    return HttpResponse.json(mockForumVote('thread', String(params.id), user.id, body.value ?? 0))
  }),

  http.put(`${API}/forum/posts/:postId/vote`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const body = (await request.json()) as { value: 1 | -1 | 0 }
    return HttpResponse.json(mockForumVote('post', String(params.postId), user.id, body.value ?? 0))
  }),

  http.put(`${API}/forum/threads/:id/reactions`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const thread = threads.find((t) => t.id === params.id)
    if (!thread) return errorResponse(404, 'not_found', 'Utas tidak ditemukan.')
    const body = (await request.json()) as { emoji: string }
    try {
      return HttpResponse.json(mockForumReaction('thread', String(params.id), user.id, body.emoji))
    } catch {
      return errorResponse(400, 'bad_request', 'Emoji tidak didukung')
    }
  }),

  http.put(`${API}/forum/posts/:postId/reactions`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const body = (await request.json()) as { emoji: string }
    try {
      return HttpResponse.json(mockForumReaction('post', String(params.postId), user.id, body.emoji))
    } catch {
      return errorResponse(400, 'bad_request', 'Emoji tidak didukung')
    }
  }),

  http.post(`${API}/forum/threads/:id/posts`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk untuk membalas.')
    const thread = threads.find((t) => t.id === params.id)
    if (!thread) return errorResponse(404, 'not_found', 'Utas tidak ditemukan.')
    const body = (await request.json()) as { body_md: string; parent_id?: string | null }
    const now = new Date().toISOString()
    let parent_id: string | null = null
    let reply_to: SocialComment['reply_to']
    try {
      const resolved = resolveMockReplyParent(repliesForThread(String(params.id)), body.parent_id)
      parent_id = resolved.parent_id
      reply_to = resolved.reply_to
    } catch {
      return errorResponse(404, 'not_found', 'Balasan induk tidak ditemukan')
    }
    const reply = {
      id: `post_${Date.now()}`,
      thread_id: String(params.id),
      author: {
        username: user.username,
        type: (user.account_type === 'organization' ? 'org' : 'user') as 'user' | 'org',
        avatar_url: user.avatar_url,
        is_official: user.is_official,
      },
      body_md: body.body_md,
      parent_id,
      reply_to,
      created_at: now,
    }
    addReply(String(params.id), reply)
    return HttpResponse.json(
      {
        id: reply.id,
        author: reply.author,
        body_md: reply.body_md,
        parent_id: reply.parent_id ?? null,
        reply_to: reply.reply_to ?? null,
        visibility: reply.visibility ?? 'public',
        created_at: reply.created_at,
        score: 0,
        upvotes: 0,
        downvotes: 0,
        user_vote: null,
        reactions: [],
      },
      { status: 201 },
    )
  }),

  http.patch(`${API}/forum/threads/:id`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const thread = findThread(String(params.id))
    if (!thread) return errorResponse(404, 'not_found', 'Utas tidak ditemukan.')
    if (thread.author.username !== user.username) {
      return errorResponse(403, 'forbidden', 'Hanya pemilik yang dapat mengubah utas')
    }
    const body = (await request.json()) as {
      title?: string
      body_md?: string
      tags?: string[]
      visibility?: 'public' | 'private'
    }
    updateThreadRecord(String(params.id), body)
    const summary = threads.find((t) => t.id === params.id)
    if (!summary) return errorResponse(404, 'not_found', 'Utas tidak ditemukan.')
    try {
      return HttpResponse.json(threadDetailOf(summary, user.id, user.username))
    } catch {
      return errorResponse(404, 'not_found', 'Utas tidak ditemukan.')
    }
  }),

  http.delete(`${API}/forum/threads/:id`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const thread = findThread(String(params.id))
    if (!thread) return new HttpResponse(null, { status: 204 })
    if (thread.author.username !== user.username) {
      return errorResponse(403, 'forbidden', 'Hanya pemilik yang dapat menghapus utas')
    }
    deleteThreadRecord(String(params.id))
    return new HttpResponse(null, { status: 204 })
  }),

  http.patch(`${API}/forum/posts/:postId`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const reply = findReply(String(params.postId))
    if (!reply) return errorResponse(404, 'not_found', 'Balasan tidak ditemukan')
    if (reply.author.username !== user.username) {
      return errorResponse(403, 'forbidden', 'Hanya pemilik yang dapat mengubah balasan')
    }
    const body = (await request.json()) as { body_md?: string; visibility?: 'public' | 'private' }
    updateReplyRecord(String(params.postId), body)
    return HttpResponse.json({
      id: reply.id,
      author: reply.author,
      body_md: reply.body_md,
      visibility: reply.visibility ?? 'public',
      created_at: reply.created_at,
      score: 0,
      upvotes: 0,
      downvotes: 0,
      user_vote: null,
      reactions: [],
    })
  }),

  http.delete(`${API}/forum/posts/:postId`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const reply = findReply(String(params.postId))
    if (!reply) return new HttpResponse(null, { status: 204 })
    if (reply.author.username !== user.username) {
      return errorResponse(403, 'forbidden', 'Hanya pemilik yang dapat menghapus balasan')
    }
    deleteReplyRecord(String(params.postId))
    return new HttpResponse(null, { status: 204 })
  }),

  // Competitions
  http.get(`${API}/competitions/stats`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    return HttpResponse.json(buildCompetitionStats(user?.id))
  }),

  http.get(`${API}/competitions`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const sort = (url.searchParams.get('sort') as 'date' | 'title_asc' | 'title_desc') || 'date'
    const year = url.searchParams.get('year') ? Number(url.searchParams.get('year')) : undefined
    let items = filterCompetitions(competitions, {
      status: url.searchParams.get('status') ?? undefined,
      tag: url.searchParams.get('tag') ?? undefined,
      sort,
      year,
      from_date: url.searchParams.get('from_date') ?? undefined,
      to_date: url.searchParams.get('to_date') ?? undefined,
    })
    items = filterByCategory(items, url.searchParams.get('category'), url.searchParams.get('subcategory'))
    return HttpResponse.json(paginate(items, page))
  }),

  http.get(`${API}/competitions/:slug`, ({ params }) => {
    const c = competitions.find((c) => c.slug === params.slug)
    if (!c) return errorResponse(404, 'not_found', 'Kompetisi tidak ditemukan.')
    return HttpResponse.json(competitionDetailOf(c))
  }),

  http.get(`${API}/competitions/:slug/stats`, ({ params }) => {
    const c = competitions.find((c) => c.slug === params.slug)
    if (!c) return errorResponse(404, 'not_found', 'Kompetisi tidak ditemukan.')
    return HttpResponse.json(compDetailStatsOf(String(params.slug)))
  }),

  http.get(`${API}/competitions/:slug/notebooks`, ({ params, request }) => {
    const c = competitions.find((c) => c.slug === params.slug)
    if (!c) return errorResponse(404, 'not_found', 'Kompetisi tidak ditemukan.')
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    const sorted = [...compNotebooks].sort(
      (a, b) => b.favorite_count - a.favorite_count || b.updated_at.localeCompare(a.updated_at)
    )
    return HttpResponse.json(paginate(sorted, page))
  }),

  http.post(`${API}/competitions/:slug/notebooks`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const c = competitions.find((x) => x.slug === params.slug)
    if (!c) return errorResponse(404, 'not_found', 'Kompetisi tidak ditemukan.')
    const nb = {
      id: `cnb_${Date.now()}`,
      title: `Notebook — ${c.title}`,
      owner: { username: user.username, type: 'user' as const, avatar_url: null },
      favorite_count: 0,
      favorited: false,
      updated_at: new Date().toISOString(),
      notebook_id: `nb_${Date.now()}`,
    }
    compNotebooks.unshift(nb)
    return HttpResponse.json(nb, { status: 201 })
  }),

  http.post(`${API}/competitions/:slug/notebooks/:id/favorite`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const nb = compNotebooks.find((n) => n.id === params.id)
    if (!nb) return errorResponse(404, 'not_found', 'Notebook tidak ditemukan')
    nb.favorited = !nb.favorited
    nb.favorite_count += nb.favorited ? 1 : -1
    compNotebooks.sort((a, b) => b.favorite_count - a.favorite_count || b.updated_at.localeCompare(a.updated_at))
    return HttpResponse.json({ favorited: nb.favorited, favorite_count: nb.favorite_count })
  }),

  http.get(`${API}/competitions/:slug/submissions/me`, ({ request }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    return HttpResponse.json(submissions)
  }),

  http.get(`${API}/competitions/:slug/leaderboard`, ({ params, request }) => {
    const board = (new URL(request.url).searchParams.get('board') ?? 'public') as 'public' | 'private'
    const comp = competitions.find((c) => c.slug === params.slug)
    if (board === 'private' && comp && comp.status !== 'past') {
      return errorResponse(403, 'leaderboard_locked', 'Leaderboard privat dibuka setelah kompetisi berakhir')
    }
    try {
      return HttpResponse.json(leaderboardOf(String(params.slug), board))
    } catch {
      return errorResponse(403, 'leaderboard_locked', 'Leaderboard privat dibuka setelah kompetisi berakhir')
    }
  }),

  http.get(`${API}/competitions/:slug/submissions`, ({ request }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Anda harus masuk untuk melihat submission.')
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    return HttpResponse.json(paginate(submissions, page))
  }),

  http.post(`${API}/competitions/:slug/submissions`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk untuk mengirim submission.')
    const slug = String(params.slug)
    const comp = competitions.find((c) => c.slug === slug)
    const dl = comp ? competitionDetailOf(comp).deadline : null
    if (!comp || !dl?.is_open) {
      return errorResponse(400, 'closed', 'Pendaftaran/Submission ditutup')
    }
    const remainingBefore = getRemainingToday(slug, user.id)
    if (remainingBefore <= 0) {
      return errorResponse(429, 'limit_reached', 'Batas 5 submission/hari tercapai')
    }
    recordSubmission(slug, user.id)
    const remaining = getRemainingToday(slug, user.id)
    const entry = {
      id: `sub_${Date.now()}`,
      created_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      status: 'submitted' as const,
      public_score: null,
      score: null,
      filename: 'submission.csv',
      remaining_today: remaining,
    }
    submissions.unshift({
      id: entry.id,
      created_at: entry.created_at,
      submitted_at: entry.submitted_at,
      status: entry.status,
      public_score: entry.public_score,
      score: entry.score,
      filename: entry.filename,
    })
    return HttpResponse.json(entry)
  }),

  http.post(`${API}/competitions/upload-cover`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    return HttpResponse.json({
      cover_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=400&fit=crop',
    })
  }),

  http.get(`${API}/me/competition-proposals`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    const mine = mockCompetitionProposals.filter((p) => p.user?.username === user.username)
    return HttpResponse.json(paginateProposals(mine, page, 50))
  }),

  http.post(`${API}/me/competition-proposals`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const body = (await request.json()) as Record<string, unknown>
    const id = `cmpp_${Date.now()}`
    const now = new Date().toISOString()
    mockCompetitionProposals.unshift({
      id,
      proposed_slug: String(body.proposed_slug ?? ''),
      title: String(body.title ?? ''),
      sponsor: (body.sponsor as string) ?? null,
      metric: String(body.metric ?? 'Accuracy'),
      prize_pool: (body.prize_pool as string) ?? null,
      starts_at: String(body.starts_at ?? now),
      ends_at: String(body.ends_at ?? now),
      cover_url: (body.cover_url as string) ?? null,
      overview_md: String(body.overview_md ?? ''),
      rules_md: String(body.rules_md ?? ''),
      dataset_info_md: String(body.dataset_info_md ?? ''),
      daily_submission_limit: Number(body.daily_submission_limit ?? 5),
      category: null,
      subcategory: null,
      status: body.submit ? 'pending_review' : 'draft',
      review_note: null,
      competition_slug: null,
      created_at: now,
      updated_at: now,
      submitted_at: body.submit ? now : null,
      user: { username: user.username, name: user.name },
    })
    return HttpResponse.json({ id, status: body.submit ? 'pending_review' : 'draft' }, { status: 201 })
  }),

  http.get(`${API}/me/competition-proposals/:id`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const p = mockCompetitionProposals.find((x) => x.id === params.id && x.user?.username === user.username)
    if (!p) return errorResponse(404, 'not_found', 'Tidak ditemukan')
    return HttpResponse.json(p)
  }),

  http.patch(`${API}/me/competition-proposals/:id`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const p = mockCompetitionProposals.find((x) => x.id === params.id && x.user?.username === user.username)
    if (!p) return errorResponse(404, 'not_found', 'Tidak ditemukan')
    if (!['draft', 'revision_requested'].includes(p.status)) {
      return errorResponse(409, 'locked', 'Tidak dapat diedit')
    }
    const body = (await request.json()) as Record<string, unknown>
    Object.assign(p, body, { updated_at: new Date().toISOString() })
    return HttpResponse.json(p)
  }),

  http.post(`${API}/me/competition-proposals/:id/submit`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const p = mockCompetitionProposals.find((x) => x.id === params.id && x.user?.username === user.username)
    if (!p) return errorResponse(404, 'not_found', 'Tidak ditemukan')
    p.status = 'pending_review'
    p.submitted_at = new Date().toISOString()
    p.review_note = null
    p.updated_at = p.submitted_at
    return HttpResponse.json({ id: p.id, status: p.status })
  }),

  // Events
  http.get(`${API}/events/stats`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    return HttpResponse.json(buildEventStats(user?.id))
  }),

  http.get(`${API}/events`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const sort = (url.searchParams.get('sort') as 'date' | 'title_asc' | 'title_desc') || 'date'
    const year = url.searchParams.get('year') ? Number(url.searchParams.get('year')) : undefined
    let items = filterEvents(events, {
      status: url.searchParams.get('status') ?? undefined,
      type: url.searchParams.get('type') ?? undefined,
      sort,
      year,
      from_date: url.searchParams.get('from_date') ?? undefined,
      to_date: url.searchParams.get('to_date') ?? undefined,
    })
    items = filterByCategory(items, url.searchParams.get('category'), url.searchParams.get('subcategory'))
    return HttpResponse.json(paginate(items, page))
  }),

  http.get(`${API}/events/:slug/calendar.ics`, ({ params }) => {
    const e = events.find((ev) => ev.slug === params.slug)
    if (!e) return errorResponse(404, 'not_found', 'Event tidak ditemukan.')
    return new HttpResponse(buildMockIcs(e), {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': `attachment; filename="${params.slug}.ics"`,
      },
    })
  }),

  http.get(`${API}/events/:slug`, ({ params, request }) => {
    const e = events.find((ev) => ev.slug === params.slug)
    if (!e) return errorResponse(404, 'not_found', 'Event tidak ditemukan.')
    const user = resolveUserFromRequest(request)
    return HttpResponse.json(detailOf(e, user?.id))
  }),

  http.post(`${API}/events/:slug/register`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk untuk mendaftar event.')
    const e = events.find((ev) => ev.slug === params.slug)
    if (!e) return errorResponse(404, 'not_found', 'Event tidak ditemukan.')
    if (e.status === 'past') return errorResponse(400, 'closed', 'Pendaftaran telah ditutup')
    const existing = eventRegistrations.find((r) => r.eventSlug === e.slug && r.userId === user.id)
    if (existing) {
      return HttpResponse.json({ registration_id: existing.id, status: existing.status })
    }
    const regCount = eventRegistrations.filter((r) => r.eventSlug === e.slug && r.status === 'registered').length
    const status = e.capacity != null && regCount >= e.capacity ? 'waitlisted' : 'registered'
    const reg = {
      id: `reg_${Date.now()}`,
      eventSlug: e.slug,
      userId: user.id,
      status: status as 'registered' | 'waitlisted',
      attended: false,
      createdAt: new Date().toISOString(),
    }
    eventRegistrations.push(reg)
    return HttpResponse.json({ registration_id: reg.id, status: reg.status }, { status: 201 })
  }),

  http.delete(`${API}/events/:slug/register`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const e = events.find((ev) => ev.slug === params.slug)
    if (!e) return errorResponse(404, 'not_found', 'Event tidak ditemukan.')
    const idx = eventRegistrations.findIndex((r) => r.eventSlug === e.slug && r.userId === user.id)
    if (idx === -1) return HttpResponse.json({ ok: true })
    const freed = eventRegistrations[idx].status === 'registered'
    eventRegistrations.splice(idx, 1)
    if (freed && e.capacity != null) {
      const nxt = eventRegistrations.find((r) => r.eventSlug === e.slug && r.status === 'waitlisted')
      if (nxt) nxt.status = 'registered'
    }
    return HttpResponse.json({ ok: true })
  }),

  http.post(`${API}/events/upload-cover`, ({ request }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    return HttpResponse.json({
      cover_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=400&fit=crop',
    })
  }),

  http.post(`${API}/events/upload-media`, ({ request }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    return HttpResponse.json({
      url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=450&fit=crop',
    })
  }),

  http.get(`${API}/me/event-proposals`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    const mine = mockEventProposals.filter((p) => p.user?.username === user.username)
    return HttpResponse.json(paginateEventProposals(mine, page, 50))
  }),

  http.post(`${API}/me/event-proposals`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const body = (await request.json()) as Record<string, unknown>
    const id = `evtp_${Date.now()}`
    const now = new Date().toISOString()
    mockEventProposals.unshift({
      id,
      proposed_slug: String(body.proposed_slug ?? ''),
      title: String(body.title ?? ''),
      type: String(body.type ?? 'webinar'),
      mode: String(body.mode ?? 'daring'),
      starts_at: String(body.starts_at ?? now),
      ends_at: String(body.ends_at ?? now),
      location: (body.location as string) ?? null,
      cover_url: (body.cover_url as string) ?? null,
      gallery_urls: (body.gallery_urls as string[]) ?? [],
      capacity: body.capacity != null ? Number(body.capacity) : null,
      description_md: String(body.description_md ?? ''),
      agenda: [],
      speakers: [],
      category: null,
      subcategory: null,
      status: body.submit ? 'pending_review' : 'draft',
      review_note: null,
      event_slug: null,
      created_at: now,
      updated_at: now,
      submitted_at: body.submit ? now : null,
      user: { username: user.username, name: user.name },
    })
    return HttpResponse.json({ id, status: body.submit ? 'pending_review' : 'draft' }, { status: 201 })
  }),

  http.patch(`${API}/me/event-proposals/:id`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const p = mockEventProposals.find((x) => x.id === params.id && x.user?.username === user.username)
    if (!p) return errorResponse(404, 'not_found', 'Tidak ditemukan')
    if (!['draft', 'revision_requested'].includes(p.status)) return errorResponse(409, 'locked', 'Tidak dapat diedit')
    Object.assign(p, await request.json(), { updated_at: new Date().toISOString() })
    return HttpResponse.json(p)
  }),

  http.post(`${API}/me/event-proposals/:id/submit`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const p = mockEventProposals.find((x) => x.id === params.id && x.user?.username === user.username)
    if (!p) return errorResponse(404, 'not_found', 'Tidak ditemukan')
    p.status = 'pending_review'
    p.submitted_at = new Date().toISOString()
    p.review_note = null
    return HttpResponse.json({ id: p.id, status: p.status })
  }),

  http.get(`${API}/admin/events/:slug/registrations`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const e = events.find((ev) => ev.slug === params.slug)
    if (!e) return errorResponse(404, 'not_found', 'Event tidak ditemukan.')
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    const items = eventRegistrations
      .filter((r) => r.eventSlug === e.slug)
      .map((r) => {
        const u = users.find((x) => x.id === r.userId)
        return {
          id: r.id,
          status: r.status,
          attended: r.attended,
          user: { username: u?.username ?? 'unknown', name: u?.name ?? 'Unknown', avatar_url: u?.avatar_url ?? null },
        }
      })
    return HttpResponse.json(paginate(items, page))
  }),

  http.patch(`${API}/admin/events/:slug/registrations/:regId`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const body = (await request.json()) as { attended?: boolean }
    const reg = eventRegistrations.find((r) => r.id === params.regId)
    if (!reg) return errorResponse(404, 'not_found', 'Pendaftaran tidak ditemukan.')
    reg.attended = body.attended ?? true
    return HttpResponse.json({ id: reg.id, attended: reg.attended })
  }),

  http.get(`${API}/me/submissions`, ({ request }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    return HttpResponse.json({
      items: [
        {
          id: 'sub_1',
          created_at: '2026-06-22T09:00:00Z',
          status: 'scored',
          public_score: 0.412,
          filename: 'submission.csv',
          competition: { slug: 'prediksi-permintaan-umkm', title: 'Prediksi Permintaan Produk UMKM' },
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    })
  }),

  http.get(`${API}/me/events`, ({ request }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const user = resolveUserFromRequest(request)!
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    const items = eventRegistrations
      .filter((r) => r.userId === user.id)
      .map((r) => {
        const e = events.find((ev) => ev.slug === r.eventSlug)!
        return {
          registration_id: r.id,
          status: r.status,
          event: {
            slug: e.slug,
            title: e.title,
            type: e.type,
            mode: e.mode,
            starts_at: e.starts_at,
            ends_at: e.ends_at,
            location: e.location,
            cover_url: e.cover_url,
          },
        }
      })
    return HttpResponse.json(paginate(items, page))
  }),

  http.get(`${API}/me/notebooks`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    const items = notebookRecords
      .filter((n) => n.owner_id === user.id)
      .map(({ id, title, owner, tags }) => ({ id, title, owner, tags }))
    return HttpResponse.json(paginate(items, page))
  }),

  http.get(`${API}/me/threads`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    const items = threads.filter((t) => t.author.username === user.username)
    return HttpResponse.json(paginate(items, page))
  }),

  http.get(`${API}/me/onboarding`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const interests = user.interests ?? []
    const token = tokenFromRequest(request) ?? ''
    const isNewUser = token.includes('siti') || interests.length === 0
    return HttpResponse.json({
      onboarded: user.onboarded ?? false,
      interests,
      checklist: isNewUser
        ? {
            profile_completed: false,
            email_verified: user.email_verified,
            interests_selected: interests.length > 0,
            has_asset: false,
            joined_competition: false,
            joined_discussion: false,
          }
        : {
            profile_completed: !!(user.avatar_url && (user.bio || user.about_md)),
            email_verified: user.email_verified,
            interests_selected: interests.length > 0,
            has_asset: true,
            joined_competition: true,
            joined_discussion: false,
          },
    })
  }),

  http.get(`${API}/me/settings`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    return HttpResponse.json(getMockUserSettings(user.id))
  }),

  http.patch(`${API}/me/settings`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const body = (await request.json()) as import('@/types/api').SettingsPatch
    return HttpResponse.json(patchMockUserSettings(user.id, body))
  }),

  http.get(`${API}/me/member-card`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    let token = mockMemberShareTokens.get(user.id)
    if (!token) {
      token = `mc_${user.username.replace(/[^a-z0-9]/gi, '').slice(0, 8)}_${Date.now().toString(36)}`
      mockMemberShareTokens.set(user.id, token)
    }
    return HttpResponse.json({ share_token: token, share_url: mockMemberShareUrl(token) })
  }),

  http.get(`${API}/share/:token`, ({ params }) => {
    const token = params.token as string
    const entry = [...mockMemberShareTokens.entries()].find(([, t]) => t === token)
    if (!entry) return errorResponse(404, 'not_found', 'Tautan profil tidak ditemukan')
    const user = users.find((u) => u.id === entry[0])
    if (!user) return errorResponse(404, 'not_found', 'Tautan profil tidak ditemukan')
    const base = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000').replace(/\/$/, '')
    return HttpResponse.json({ username: user.username, profile_url: `${base}/${user.username}` })
  }),

  http.post(`${API}/me/onboarding/complete`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const idx = users.findIndex((u) => u.id === user.id)
    if (idx >= 0) users[idx] = { ...users[idx], onboarded: true }
    return HttpResponse.json({ onboarded: true })
  }),

  // Admin
  http.get(`${API}/admin/stats`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    return HttpResponse.json({
      users: adminUsers.length,
      repos: repos.length,
      competitions: competitions.length,
      events: events.length,
      courses: courses.length,
      threads: threads.length,
      teams: mockTeams.length,
    })
  }),

  http.get(`${API}/admin/users`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isSuperadmin(user)) return errorResponse(403, 'forbidden', 'Khusus super admin')
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase()
    let items = adminUsers
    if (q) items = items.filter((u) => u.username.includes(q) || u.email.includes(q) || u.name.toLowerCase().includes(q))
    return HttpResponse.json(paginate(items))
  }),

  http.patch(`${API}/admin/users/:id`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isSuperadmin(user)) return errorResponse(403, 'forbidden', 'Khusus super admin')
    const body = (await request.json()) as { role?: string; is_active?: boolean }
    const target = adminUsers.find((u) => u.id === params.id)
    if (!target) return errorResponse(404, 'not_found', 'Pengguna tidak ditemukan')
    if (body.role) target.role = body.role as typeof target.role
    if (typeof body.is_active === 'boolean') target.is_active = body.is_active
    return HttpResponse.json(target)
  }),

  http.delete(`${API}/admin/users/:id`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isSuperadmin(user)) return errorResponse(403, 'forbidden', 'Khusus super admin')
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/admin/repos`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase()
    let items = repos
    if (q) items = items.filter((r) => r.name.includes(q) || r.slug.includes(q))
    return HttpResponse.json(paginate(items))
  }),

  http.patch(`${API}/admin/repos/:id`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const body = (await request.json()) as { visibility?: 'public' | 'private'; featured?: boolean }
    const repo = repos.find((r) => r.id === params.id)
    if (!repo) return errorResponse(404, 'not_found', 'Aset tidak ditemukan')
    if (body.visibility) repo.visibility = body.visibility
    if (typeof body.featured === 'boolean') repo.featured = body.featured
    return HttpResponse.json(repo)
  }),

  http.delete(`${API}/admin/repos/:id`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/admin/teams`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.toLowerCase()
    const page = Number(url.searchParams.get('page') ?? 1)
    let items = mockTeams.map(adminTeamOf)
    if (q) {
      items = items.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.slug.includes(q) ||
          (t.focus?.toLowerCase().includes(q) ?? false) ||
          t.owner_username.includes(q),
      )
    }
    return HttpResponse.json(paginate(items, page))
  }),

  http.patch(`${API}/admin/teams/:id`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const body = (await request.json()) as { visibility?: 'public' | 'private'; featured?: boolean }
    const t = mockTeams.find((x) => x.id === params.id)
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    if (body.visibility) t.visibility = body.visibility
    if (typeof body.featured === 'boolean') t.featured = body.featured
    return HttpResponse.json(adminTeamOf(t))
  }),

  http.delete(`${API}/admin/teams/:id`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const idx = mockTeams.findIndex((x) => x.id === params.id)
    if (idx < 0) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    const t = mockTeams[idx]
    mockTeams.splice(idx, 1)
    for (let i = mockTeamMembers.length - 1; i >= 0; i--) {
      if (mockTeamMembers[i].team_id === t.id) mockTeamMembers.splice(i, 1)
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/admin/competitions`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    return HttpResponse.json({ slug: 'kompetisi-baru' }, { status: 201 })
  }),

  http.patch(`${API}/admin/competitions/:slug`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const body = (await request.json()) as Record<string, unknown>
    const comp = competitions.find((c) => c.slug === params.slug)
    if (!comp) return errorResponse(404, 'not_found', 'Kompetisi tidak ditemukan')
    if (typeof body.featured === 'boolean') comp.featured = body.featured
    if (typeof body.cover_url === 'string' || body.cover_url === null) comp.cover_url = body.cover_url as string | null
    if (typeof body.title === 'string') comp.title = body.title
    if (typeof body.sponsor === 'string') comp.sponsor = body.sponsor
    if (typeof body.status === 'string') comp.status = body.status as typeof comp.status
    if (typeof body.metric === 'string') comp.metric = body.metric
    if (typeof body.prize_pool === 'string') comp.prize_pool = body.prize_pool
    return HttpResponse.json({ slug: comp.slug })
  }),

  http.get(`${API}/admin/competitions/:slug/submissions`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const status = new URL(request.url).searchParams.get('status') ?? 'submitted'
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    const items = submissions
      .filter((s) => s.status === status)
      .map((s) => ({
        ...s,
        entrant: { kind: 'user' as const, name: 'demo-user', username: 'demo-user' },
      }))
    return HttpResponse.json(paginate(items, page))
  }),

  http.post(`${API}/admin/competitions/:slug/submissions/:id/start-review`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const s = submissions.find((x) => x.id === params.id)
    if (!s) return errorResponse(404, 'not_found', 'Tidak ditemukan')
    if (s.status !== 'submitted') return errorResponse(409, 'invalid_transition', 'Status tidak valid')
    s.status = 'under_review'
    return HttpResponse.json({ status: s.status })
  }),

  http.post(`${API}/admin/competitions/:slug/submissions/:id/score`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const s = submissions.find((x) => x.id === params.id)
    if (!s) return errorResponse(404, 'not_found', 'Tidak ditemukan')
    const body = (await request.json()) as { score: number; note?: string }
    if (typeof body.score !== 'number') return errorResponse(422, 'bad_score', 'Skor harus angka')
    s.status = 'scored'
    s.public_score = body.score
    s.score = body.score
    s.review_note = body.note ?? null
    return HttpResponse.json({ status: s.status, score: body.score })
  }),

  http.post(`${API}/admin/competitions/:slug/submissions/:id/reject`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const s = submissions.find((x) => x.id === params.id)
    if (!s) return errorResponse(404, 'not_found', 'Tidak ditemukan')
    const body = (await request.json()) as { note?: string }
    s.status = 'rejected'
    s.review_note = body.note ?? null
    return HttpResponse.json({ status: s.status })
  }),

  http.post(`${API}/admin/competitions/:slug/submissions/:id/reopen`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const s = submissions.find((x) => x.id === params.id)
    if (!s) return errorResponse(404, 'not_found', 'Tidak ditemukan')
    s.status = 'under_review'
    s.public_score = null
    s.score = null
    return HttpResponse.json({ status: s.status })
  }),

  http.get(`${API}/admin/competition-proposals`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const status = url.searchParams.get('status')
    let items = [...mockCompetitionProposals]
    if (status) items = items.filter((p) => p.status === status)
    return HttpResponse.json(paginateProposals(items, page, 50))
  }),

  http.get(`${API}/admin/competition-proposals/:id`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const p = mockCompetitionProposals.find((x) => x.id === params.id)
    if (!p) return errorResponse(404, 'not_found', 'Tidak ditemukan')
    return HttpResponse.json(p)
  }),

  http.patch(`${API}/admin/competition-proposals/:id/review`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const p = mockCompetitionProposals.find((x) => x.id === params.id)
    if (!p) return errorResponse(404, 'not_found', 'Tidak ditemukan')
    const body = (await request.json()) as { action: string; review_note?: string }
    if (body.action === 'approve') {
      const slug = p.proposed_slug || `kompetisi-${Date.now()}`
      competitions.unshift({
        slug,
        title: p.title,
        sponsor: p.sponsor,
        status: 'upcoming',
        metric: p.metric,
        participants: 0,
        prize_pool: p.prize_pool,
        starts_at: p.starts_at,
        ends_at: p.ends_at,
        cover_url: p.cover_url,
      })
      p.status = 'approved'
      p.competition_slug = slug
    } else if (body.action === 'revision_requested') {
      p.status = 'revision_requested'
      p.review_note = body.review_note ?? 'Perlu revisi'
    } else if (body.action === 'reject') {
      p.status = 'rejected'
      p.review_note = body.review_note ?? 'Ditolak'
    }
    p.updated_at = new Date().toISOString()
    return HttpResponse.json({ status: p.status, competition_slug: p.competition_slug ?? null })
  }),

  http.post(`${API}/admin/competitions/:slug/ground-truth`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    return HttpResponse.json({ ok: true })
  }),

  http.delete(`${API}/admin/competitions/:slug`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/admin/events`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    return HttpResponse.json({ slug: 'event-baru' }, { status: 201 })
  }),

  http.patch(`${API}/admin/events/:slug`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const body = (await request.json()) as Record<string, unknown>
    const evt = events.find((e) => e.slug === params.slug)
    if (!evt) return errorResponse(404, 'not_found', 'Event tidak ditemukan')
    if (typeof body.featured === 'boolean') evt.featured = body.featured
    if (typeof body.cover_url === 'string' || body.cover_url === null) evt.cover_url = body.cover_url as string | null
    if (Array.isArray(body.gallery_urls)) evt.gallery_urls = body.gallery_urls as string[]
    if (typeof body.title === 'string') evt.title = body.title
    if (typeof body.description_md === 'string') {
      // stored in detailOf only in mock — attach on event object
      ;(evt as { description_md?: string }).description_md = body.description_md as string
    }
    return HttpResponse.json({ slug: evt.slug })
  }),

  http.get(`${API}/admin/event-proposals`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const status = url.searchParams.get('status')
    let items = [...mockEventProposals]
    if (status) items = items.filter((p) => p.status === status)
    return HttpResponse.json(paginateEventProposals(items, page, 50))
  }),

  http.patch(`${API}/admin/event-proposals/:id/review`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const p = mockEventProposals.find((x) => x.id === params.id)
    if (!p) return errorResponse(404, 'not_found', 'Tidak ditemukan')
    const body = (await request.json()) as { action: string; review_note?: string }
    if (body.action === 'approve') {
      const slug = p.proposed_slug || `event-${Date.now()}`
      events.unshift({
        slug,
        title: p.title,
        type: p.type,
        mode: p.mode,
        status: 'upcoming',
        starts_at: p.starts_at,
        ends_at: p.ends_at,
        location: p.location ?? null,
        cover_url: p.cover_url ?? null,
        gallery_urls: p.gallery_urls ?? [],
        registered: 0,
        capacity: p.capacity ?? null,
      })
      p.status = 'approved'
      p.event_slug = slug
    } else if (body.action === 'revision_requested') {
      p.status = 'revision_requested'
      p.review_note = body.review_note ?? 'Perlu revisi'
    } else if (body.action === 'reject') {
      p.status = 'rejected'
      p.review_note = body.review_note ?? 'Ditolak'
    }
    return HttpResponse.json({ status: p.status, event_slug: p.event_slug ?? null })
  }),

  http.delete(`${API}/admin/events/:slug`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/admin/courses`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    return HttpResponse.json({ slug: 'course-baru' }, { status: 201 })
  }),

  http.patch(`${API}/admin/courses/:slug`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    return HttpResponse.json({ slug: 'updated' })
  }),

  http.delete(`${API}/admin/courses/:slug`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/admin/learning-paths`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const body = (await request.json()) as {
      slug: string
      title: string
      description?: string
      items?: PathItem[]
      course_slugs?: string[]
    }
    if (learningPaths.some((p) => p.slug === body.slug)) {
      return errorResponse(409, 'conflict', 'Slug sudah dipakai')
    }
    const items =
      body.items ??
      (body.course_slugs ?? []).map((ref) => ({ phase: 'belajar' as const, type: 'course' as const, ref }))
    learningPaths.push({
      slug: body.slug,
      title: body.title,
      description: body.description ?? '',
      courses_count: items.filter((i) => i.type === 'course').length,
      items_count: items.length,
      phase_counts: countPhases(items),
    })
    setPathItems(body.slug, items)
    return HttpResponse.json({ slug: body.slug }, { status: 201 })
  }),

  http.patch(`${API}/admin/learning-paths/:slug`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const body = (await request.json()) as {
      title?: string
      description?: string
      items?: PathItem[]
      course_slugs?: string[]
    }
    const path = learningPaths.find((p) => p.slug === params.slug)
    if (!path) return errorResponse(404, 'not_found', 'Jalur tidak ditemukan')
    if (body.title) path.title = body.title
    if (body.description !== undefined) path.description = body.description
    if (body.items) setPathItems(String(params.slug), body.items)
    else if (body.course_slugs)
      setPathItems(
        String(params.slug),
        body.course_slugs.map((ref) => ({ phase: 'belajar', type: 'course', ref })),
      )
    return HttpResponse.json({ slug: path.slug })
  }),

  http.delete(`${API}/admin/learning-paths/:slug`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const idx = learningPaths.findIndex((p) => p.slug === params.slug)
    if (idx === -1) return errorResponse(404, 'not_found', 'Jalur tidak ditemukan')
    learningPaths.splice(idx, 1)
    setPathItems(String(params.slug), [])
    return new HttpResponse(null, { status: 204 })
  }),

  http.delete(`${API}/admin/threads/:id`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    return new HttpResponse(null, { status: 204 })
  }),

  // Announcements
  http.get(`${API}/announcements`, () => {
    const active = announcements.filter((a) => a.active).map(({ id, title, body_md, level }) => ({ id, title, body_md, level }))
    return HttpResponse.json(active)
  }),

  http.get(`${API}/admin/announcements`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    return HttpResponse.json(announcements)
  }),

  http.post(`${API}/admin/announcements`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const body = (await request.json()) as Omit<MockAnnouncement, 'id'>
    const ann: MockAnnouncement = { id: `ann_${Date.now()}`, ...body }
    announcements.push(ann)
    return HttpResponse.json({ id: ann.id }, { status: 201 })
  }),

  http.patch(`${API}/admin/announcements/:id`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const body = (await request.json()) as Partial<Omit<MockAnnouncement, 'id'>>
    const ann = announcements.find((a) => a.id === params.id)
    if (!ann) return errorResponse(404, 'not_found', 'Pengumuman tidak ditemukan')
    Object.assign(ann, body)
    return HttpResponse.json({ id: ann.id })
  }),

  http.delete(`${API}/admin/announcements/:id`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
    const idx = announcements.findIndex((a) => a.id === params.id)
    if (idx === -1) return errorResponse(404, 'not_found', 'Pengumuman tidak ditemukan')
    announcements.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // Blog
  http.get(`${API}/blog`, ({ request }) => {
    const url = new URL(request.url)
    const tag = url.searchParams.get('tag') ?? undefined
    const status = url.searchParams.get('status') ?? undefined
    const page = Number(url.searchParams.get('page') ?? 1)
    const user = resolveUserFromRequest(request)
    const effectiveStatus = user && isStaff(user) && status ? status : undefined
    let items = listMockBlog({ tag, status: effectiveStatus })
    return HttpResponse.json(paginate(items, page))
  }),

  http.get(`${API}/blog/:slug`, ({ request, params }) => {
    const viewer = resolveUserFromRequest(request)
    const article = getMockArticle(String(params.slug))
    if (!article) return errorResponse(404, 'not_found', 'Artikel tidak ditemukan')
    if (article.status !== 'published' && !(viewer && isStaff(viewer))) {
      return errorResponse(404, 'not_found', 'Artikel tidak ditemukan')
    }
    return HttpResponse.json(article)
  }),

  http.post(`${API}/blog`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Khusus staf')
    const body = (await request.json()) as Record<string, unknown>
    if (mockBlogPosts.some((p) => p.slug === body.slug)) {
      return errorResponse(409, 'exists', 'Slug sudah dipakai')
    }
    const author = users.find((u) => u.username === user.username)
    mockBlogPosts.unshift({
      slug: String(body.slug),
      title: String(body.title ?? ''),
      summary: String(body.summary ?? ''),
      body_md: String(body.body_md ?? ''),
      cover_url: (body.cover_url as string) ?? null,
      tags: (body.tags as string[]) ?? [],
      author: {
        username: user.username,
        type: author?.account_type === 'organization' ? 'org' : 'user',
        avatar_url: author?.avatar_url ?? null,
        is_official: author?.is_official ?? false,
      },
      published_at: null,
      status: 'draft',
    })
    return HttpResponse.json({ slug: body.slug }, { status: 201 })
  }),

  http.patch(`${API}/blog/:slug`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Khusus staf')
    const body = (await request.json()) as Record<string, unknown>
    const article = mockBlogPosts.find((p) => p.slug === params.slug)
    if (!article) return errorResponse(404, 'not_found', 'Artikel tidak ditemukan')
    if (body.title !== undefined) article.title = String(body.title)
    if (body.summary !== undefined) article.summary = String(body.summary)
    if (body.body_md !== undefined) article.body_md = String(body.body_md)
    if (body.cover_url !== undefined) article.cover_url = (body.cover_url as string) ?? null
    if (body.tags !== undefined) article.tags = body.tags as string[]
    if (body.status === 'published') {
      article.status = 'published'
      if (!article.published_at) article.published_at = new Date().toISOString()
    } else if (body.status === 'draft') {
      article.status = 'draft'
    }
    return HttpResponse.json({ slug: article.slug })
  }),

  http.delete(`${API}/blog/:slug`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Khusus staf')
    const idx = mockBlogPosts.findIndex((p) => p.slug === params.slug)
    if (idx !== -1) mockBlogPosts.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/blog/images`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Khusus staf')
    return HttpResponse.json({ url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800' })
  }),

  // Search & discover
  http.get(`${API}/search`, ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q') ?? ''
    const type = url.searchParams.get('type')
    const limit = url.searchParams.get('limit')
    const perCategory = url.searchParams.get('per_category')
    const page = url.searchParams.get('page')

    const universal = runUniversalSearch(q, {
      type,
      limit: limit ? Number(limit) : undefined,
      perCategory: perCategory ? Number(perCategory) : undefined,
      page: page ? Number(page) : undefined,
    })

    // Kompatibilitas mundur: pemilih aset lama memakai {repos,competitions} via type=repos/competitions.
    if (type === 'repos' || type === 'competitions') {
      const ql = q.toLowerCase()
      const repoHits =
        type === 'repos'
          ? repos
              .filter(
                (r) =>
                  r.visibility === 'public' &&
                  (r.name.toLowerCase().includes(ql) ||
                    r.description.toLowerCase().includes(ql) ||
                    r.tags.some((t) => t.toLowerCase().includes(ql))),
              )
              .slice(0, 10)
              .map((r) => ({
                id: r.id,
                slug: r.slug,
                kind: r.kind,
                name: r.name,
                description: r.description,
                tags: r.tags,
                visibility: r.visibility,
                owner: r.owner.username,
                likes: r.likes,
                downloads: r.downloads,
                updated_at: r.updated_at,
              }))
          : []
      const compHits =
        type === 'competitions'
          ? competitions
              .filter(
                (c) =>
                  c.title.toLowerCase().includes(ql) ||
                  (c.sponsor?.toLowerCase().includes(ql) ?? false),
              )
              .slice(0, 10)
              .map((c) => ({
                id: c.slug,
                slug: c.slug,
                title: c.title,
                sponsor: c.sponsor,
                status: c.status,
                tags: competitionDetailOf(c).tags,
              }))
          : []
      return HttpResponse.json({ ...universal, repos: repoHits, competitions: compHits })
    }

    return HttpResponse.json(universal)
  }),

  http.get(`${API}/discover`, () => {
    const publicRepos = repos.filter((r) => r.visibility === 'public')
    const featured = publicRepos.filter((r) => r.featured).slice(0, 6)
    const recent = [...publicRepos].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6)
    return HttpResponse.json({ featured, recent })
  }),

  // Social
  http.post(`${API}/users/:username/follow`, ({ params, request }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const target = users.find((u) => u.username === params.username)
    if (!target) return errorResponse(404, 'not_found', 'Akun tidak ditemukan')
    if (target.id === viewer.id) return errorResponse(400, 'self', 'Tidak bisa mengikuti diri sendiri')
    if (!mockFollows[viewer.id]) mockFollows[viewer.id] = new Set()
    mockFollows[viewer.id].add(target.id)
    return HttpResponse.json({ following: true }, { status: 201 })
  }),

  http.delete(`${API}/users/:username/follow`, ({ params, request }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const target = users.find((u) => u.username === params.username)
    if (!target) return errorResponse(404, 'not_found', 'Akun tidak ditemukan')
    mockFollows[viewer.id]?.delete(target.id)
    return HttpResponse.json({ following: false })
  }),

  http.delete(`${API}/users/:username/followers/:followerUsername`, ({ params, request }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const target = users.find((u) => u.username === params.username)
    if (!target) return errorResponse(404, 'not_found', 'Akun tidak ditemukan')
    if (target.id !== viewer.id) return errorResponse(403, 'forbidden', 'Hanya pemilik profil yang dapat menghapus pengikut')
    const follower = users.find((u) => u.username === params.followerUsername)
    if (!follower) return errorResponse(404, 'not_found', 'Akun tidak ditemukan')
    for (const [followerId, following] of Object.entries(mockFollows)) {
      if (followerId === follower.id && following.has(target.id)) {
        following.delete(target.id)
        break
      }
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/users/:username/followers`, ({ params, request }) => {
    const user = users.find((u) => u.username === params.username)
    if (!user) return errorResponse(404, 'not_found', 'Akun tidak ditemukan')
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    return HttpResponse.json(paginate(followersOf(user.id), page))
  }),

  http.get(`${API}/users/:username/following`, ({ params, request }) => {
    const user = users.find((u) => u.username === params.username)
    if (!user) return errorResponse(404, 'not_found', 'Akun tidak ditemukan')
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    return HttpResponse.json(paginate(followingOf(user.id), page))
  }),

  http.get(`${API}/feed/stats`, ({ request }) => {
    const viewer = resolveUserFromRequest(request)
    return HttpResponse.json(buildFeedStats(viewer?.id))
  }),

  http.get(`${API}/discovery/panels`, ({ request }) => {
    const viewer = resolveUserFromRequest(request)
    return HttpResponse.json(buildDiscoveryPanels(viewer?.id))
  }),

  http.get(`${API}/discovery/:kind`, ({ request, params }) => {
    const viewer = resolveUserFromRequest(request)
    const kind = String(params.kind)
    if (kind === 'similar' && !viewer) {
      return errorResponse(401, 'unauthorized', 'Masuk untuk melihat orang serupa')
    }
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    const items = discoveryListForKind(kind, viewer?.id)
    return HttpResponse.json(paginate(items, page))
  }),

  http.get(`${API}/assets/:kind/:owner/:name/stats`, ({ request, params }) => {
    const viewer = resolveUserFromRequest(request)
    const slug = `${params.owner}/${params.name}`
    return HttpResponse.json(getMockAssetStats(String(params.kind), slug, viewer?.id))
  }),

  http.post(`${API}/assets/:kind/:owner/:name/love`, ({ request, params }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const slug = `${params.owner}/${params.name}`
    try {
      const result = toggleMockLove(String(params.kind), slug, viewer.id)
      syncMockLikedOnLove(viewer.id, String(params.kind), slug, result.liked)
      return HttpResponse.json(result)
    } catch {
      return errorResponse(422, 'cannot_love_own', 'Tak bisa menyukai aset sendiri')
    }
  }),

  http.post(`${API}/assets/:kind/:owner/:name/share`, async ({ request, params }) => {
    const slug = `${params.owner}/${params.name}`
    const body = (await request.json()) as { channel: 'feed' | 'forum' | 'external' | 'link' }
    return HttpResponse.json(mockShare(String(params.kind), slug, body.channel ?? 'link'))
  }),

  http.post(`${API}/assets/:kind/:owner/:name/download`, ({ params }) => {
    const slug = `${params.owner}/${params.name}`
    return HttpResponse.json(mockDownload(String(params.kind), slug))
  }),

  http.post(`${API}/assets/:kind/:owner/:name/view`, ({ params }) => {
    const slug = `${params.owner}/${params.name}`
    return HttpResponse.json(mockView(String(params.kind), slug))
  }),

  http.get(`${API}/assets/notebook/:id/stats`, ({ request, params }) => {
    const viewer = resolveUserFromRequest(request)
    return HttpResponse.json(getMockAssetStats('notebook', String(params.id), viewer?.id))
  }),

  http.post(`${API}/assets/notebook/:id/love`, ({ request, params }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    try {
      const result = toggleMockLove('notebook', String(params.id), viewer.id)
      syncMockLikedOnLove(viewer.id, 'notebook', String(params.id), result.liked)
      return HttpResponse.json(result)
    } catch {
      return errorResponse(422, 'cannot_love_own', 'Tak bisa menyukai aset sendiri')
    }
  }),

  http.post(`${API}/assets/notebook/:id/share`, async ({ request, params }) => {
    const body = (await request.json()) as { channel: 'feed' | 'forum' | 'external' | 'link' }
    return HttpResponse.json(mockShare('notebook', String(params.id), body.channel ?? 'link'))
  }),

  http.post(`${API}/assets/notebook/:id/download`, ({ params }) => {
    return HttpResponse.json(mockDownload('notebook', String(params.id)))
  }),

  http.post(`${API}/assets/notebook/:id/view`, ({ params }) => {
    return HttpResponse.json(mockView('notebook', String(params.id)))
  }),

  http.get(`${API}/users/:username/stats`, ({ params, request }) => {
    const user = users.find((u) => u.username === params.username)
    if (!user) return errorResponse(404, 'not_found', 'Pengguna tidak ditemukan')
    const viewer = resolveUserFromRequest(request)
    if (!canViewMockProfile(user.id, viewer?.id ?? null, viewer?.role)) {
      return errorResponse(403, 'private_profile', 'Profil ini privat')
    }
    return HttpResponse.json(getMockUserEngagement(user.username))
  }),

  http.get(`${API}/me/liked-assets`, ({ request }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    return HttpResponse.json(getMockLikedPage(viewer.id, viewer.id, page))
  }),

  http.get(`${API}/users/:username/liked-assets`, ({ request, params }) => {
    const user = users.find((u) => u.username === params.username)
    if (!user) return errorResponse(404, 'not_found', 'Pengguna tidak ditemukan')
    const viewer = resolveUserFromRequest(request)
    if (!canViewMockProfile(user.id, viewer?.id ?? null, viewer?.role)) {
      return errorResponse(403, 'private_profile', 'Profil ini privat')
    }
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    return HttpResponse.json(getMockLikedPage(user.id, viewer?.id ?? null, page))
  }),

  http.get(`${API}/users/:username/liked-assets/summary`, ({ request, params }) => {
    const user = users.find((u) => u.username === params.username)
    if (!user) return errorResponse(404, 'not_found', 'Pengguna tidak ditemukan')
    const viewer = resolveUserFromRequest(request)
    if (!canViewMockProfile(user.id, viewer?.id ?? null, viewer?.role)) {
      return errorResponse(403, 'private_profile', 'Profil ini privat')
    }
    return HttpResponse.json(getMockLikedSummary(user.id, viewer?.id ?? null))
  }),

  http.patch(async ({ request }) => {
    const url = new URL(request.url)
    if (!url.pathname.includes('/me/liked-assets/') || !url.pathname.endsWith('/visibility')) {
      return
    }
    const match = url.pathname.match(/\/me\/liked-assets\/([^/]+)\/(.+)\/visibility\/?$/)
    if (!match) return
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const kind = decodeURIComponent(match[1])
    const slug = decodeURIComponent(match[2])
    const body = (await request.json()) as { is_public?: boolean }
    try {
      return HttpResponse.json(
        patchMockLikedItemVisibility(viewer.id, kind, slug, Boolean(body.is_public)),
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'not_found'
      if (msg === 'not_asset') return errorResponse(422, 'not_asset', 'Hanya aset yang bisa ditandai')
      return errorResponse(404, 'not_found', 'Aset tidak ada di daftar suka')
    }
  }),

  http.patch(`${API}/me/settings/liked-list`, async ({ request }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const body = (await request.json()) as { list_public?: boolean; default_public?: boolean }
    return HttpResponse.json(patchMockLikedListSettings(viewer.id, body))
  }),

  http.get(`${API}/feed`, ({ request }) => {
    const viewer = resolveUserFromRequest(request)
    const url = new URL(request.url)
    const scope = (url.searchParams.get('scope') ?? 'following') as 'following' | 'all'
    const page = Number(url.searchParams.get('page') ?? 1)
    if (!viewer && scope === 'following') {
      return errorResponse(401, 'unauthorized', 'Belum masuk')
    }
    const items = feedForUser(viewer?.id ?? '', scope, viewer?.username).map((p) => ({
      ...p,
      liked: viewer ? (mockPostLikes[p.id]?.has(viewer.id) ?? p.liked) : false,
    }))
    return HttpResponse.json(paginate(items, page))
  }),

  http.get(`${API}/users/:username/posts`, ({ params, request }) => {
    const user = users.find((u) => u.username === params.username)
    if (!user) return errorResponse(404, 'not_found', 'Akun tidak ditemukan')
    const viewer = resolveUserFromRequest(request)
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const items = postsByUsername(params.username as string, viewer?.username).map((p) => ({
      ...p,
      liked: viewer ? (mockPostLikes[p.id]?.has(viewer.id) ?? false) : false,
    }))
    return HttpResponse.json(paginate(items, page))
  }),

  http.post(`${API}/posts`, async ({ request }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const body = (await request.json()) as {
      body_md?: string
      images?: string[]
      asset?: { kind: string; slug: string }
      visibility?: 'public' | 'private'
    }
    const post: SocialPost = {
      id: `sps_${Date.now()}`,
      author: {
        username: viewer.username,
        name: viewer.name,
        type: (viewer.account_type === 'organization' ? 'org' : 'user') as 'user' | 'org',
        avatar_url: viewer.avatar_url,
        is_official: viewer.is_official,
      },
      body_md: body.body_md ?? '',
      images: body.images ?? [],
      asset: body.asset ?? null,
      like_count: 0,
      comment_count: 0,
      liked: false,
      visibility: body.visibility ?? 'public',
      created_at: new Date().toISOString(),
    }
    mockPosts.unshift(post)
    return HttpResponse.json(post, { status: 201 })
  }),

  http.get(`${API}/posts/:id`, ({ params, request }) => {
    const viewer = resolveUserFromRequest(request)
    const post = mockPosts.find((p) => p.id === params.id)
    if (!post) return errorResponse(404, 'not_found', 'Postingan tidak ditemukan')
    if (
      post.visibility === 'private' &&
      (!viewer || post.author.username !== viewer.username)
    ) {
      return errorResponse(404, 'not_found', 'Postingan tidak ditemukan')
    }
    return HttpResponse.json({
      ...post,
      liked: viewer ? (mockPostLikes[post.id]?.has(viewer.id) ?? false) : false,
    })
  }),

  http.patch(`${API}/posts/:id`, async ({ params, request }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const idx = mockPosts.findIndex((p) => p.id === params.id)
    if (idx < 0) return errorResponse(404, 'not_found', 'Postingan tidak ditemukan')
    const post = mockPosts[idx]
    if (post.author.username !== viewer.username) {
      return errorResponse(403, 'forbidden', 'Hanya pemilik yang dapat mengubah postingan')
    }
    const body = (await request.json()) as {
      body_md?: string
      visibility?: 'public' | 'private'
      images?: string[]
    }
    if (body.body_md !== undefined) post.body_md = body.body_md
    if (body.visibility !== undefined) post.visibility = body.visibility
    if (body.images !== undefined) post.images = body.images
    return HttpResponse.json({
      ...post,
      liked: mockPostLikes[post.id]?.has(viewer.id) ?? post.liked,
    })
  }),

  http.delete(`${API}/posts/:id`, ({ params, request }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const idx = mockPosts.findIndex((p) => p.id === params.id)
    if (idx < 0) return new HttpResponse(null, { status: 204 })
    const post = mockPosts[idx]
    if (post.author.username !== viewer.username && !isStaff(viewer)) {
      return errorResponse(403, 'forbidden', 'Tidak diizinkan')
    }
    mockPosts.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/posts/:id/like`, ({ params, request }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const post = mockPosts.find((p) => p.id === params.id)
    if (!post) return errorResponse(404, 'not_found', 'Postingan tidak ditemukan')
    if (!mockPostLikes[post.id]) mockPostLikes[post.id] = new Set()
    if (!mockPostLikes[post.id].has(viewer.id)) {
      mockPostLikes[post.id].add(viewer.id)
      post.like_count += 1
    }
    return HttpResponse.json({ liked: true, like_count: post.like_count })
  }),

  http.delete(`${API}/posts/:id/like`, ({ params, request }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const post = mockPosts.find((p) => p.id === params.id)
    if (!post) return errorResponse(404, 'not_found', 'Postingan tidak ditemukan')
    if (mockPostLikes[post.id]?.has(viewer.id)) {
      mockPostLikes[post.id].delete(viewer.id)
      post.like_count = Math.max(0, post.like_count - 1)
    }
    return HttpResponse.json({ liked: false, like_count: post.like_count })
  }),

  http.get(`${API}/posts/:id/comments`, ({ params, request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const items = mockComments[params.id as string] ?? []
    return HttpResponse.json(paginate(items, page))
  }),

  http.post(`${API}/posts/:id/comments`, async ({ params, request }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const post = mockPosts.find((p) => p.id === params.id)
    if (!post) return errorResponse(404, 'not_found', 'Postingan tidak ditemukan')
    const body = (await request.json()) as { body_md: string; parent_id?: string | null }
    const list = mockComments[post.id] ?? []
    let parent_id: string | null = null
    let reply_to: SocialComment['reply_to']
    try {
      const resolved = resolveMockCommentParent(list, body.parent_id)
      parent_id = resolved.parent_id
      reply_to = resolved.reply_to
    } catch {
      return errorResponse(404, 'not_found', 'Komentar induk tidak ditemukan')
    }
    const comment: SocialComment = {
      id: `spc_${Date.now()}`,
      author: {
        username: viewer.username,
        type: (viewer.account_type === 'organization' ? 'org' : 'user') as 'user' | 'org',
        avatar_url: viewer.avatar_url,
        is_official: viewer.is_official,
      },
      body_md: body.body_md,
      parent_id,
      reply_to,
      created_at: new Date().toISOString(),
    }
    if (!mockComments[post.id]) mockComments[post.id] = []
    mockComments[post.id].push(comment)
    post.comment_count += 1
    return HttpResponse.json(comment, { status: 201 })
  }),

  http.post(`${API}/posts/images`, async ({ request }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    return HttpResponse.json({
      url: `https://picsum.photos/seed/${viewer.username}-${Date.now()}/800/450`,
    })
  }),

  http.get(`${API}/me/gamification`, ({ request }) => {
    const viewer = resolveUserFromRequest(request)
    if (!viewer) return errorResponse(401, 'unauthorized', 'Belum masuk')
    return HttpResponse.json(mockGamificationFor(viewer.username))
  }),

  http.get(`${API}/leaderboard/contributors`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    return HttpResponse.json(paginate(mockContributors, page))
  }),

  // Notifications
  http.get(`${API}/me/notifications`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const url = new URL(request.url)
    const unread = url.searchParams.get('unread') === 'true'
    const page = Number(url.searchParams.get('page') ?? 1)
    let items = notificationsForUser(user.id)
    if (unread) items = items.filter((n) => !n.read)
    items = [...items].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return HttpResponse.json(paginate(items, page))
  }),

  http.get(`${API}/me/notifications/unread-count`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    return HttpResponse.json({ count: unreadCountForUser(user.id) })
  }),

  http.post(`${API}/me/notifications/:id/read`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const n = mockNotifications.find((x) => x.id === params.id && x.user_id === user.id)
    if (n) n.read = true
    return HttpResponse.json({ ok: true })
  }),

  http.post(`${API}/me/notifications/read-all`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    mockNotifications.forEach((n) => {
      if (n.user_id === user.id) n.read = true
    })
    return HttpResponse.json({ ok: true })
  }),

  // Categories
  http.get(`${API}/categories`, () => HttpResponse.json(mockCategoryStore)),

  http.get(`${API}/categories/:slug`, ({ params }) => {
    const main = mockCategoryStore.find((c) => c.slug === params.slug)
    if (!main) return errorResponse(404, 'not_found', 'Kategori tidak ditemukan')
    return HttpResponse.json({
      ...main,
      subcategories: mockSubStore[String(params.slug)] ?? [],
    })
  }),

  http.post(`${API}/categories/:slug/subcategories`, async ({ request, params }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const body = (await request.json()) as { name: string }
    const parentSlug = String(params.slug)
    const subs = mockSubStore[parentSlug] ?? []
    const slug = slugifyCategoryName(body.name)
    const dup = subs.find((s) => s.slug === slug)
    if (dup) {
      return errorResponse(409, 'subcategory_exists', `Subkategori '${dup.name}' sudah ada`)
    }
    const created = { slug, name: body.name.trim() }
    subs.push(created)
    mockSubStore[parentSlug] = subs
    const main = mockCategoryStore.find((c) => c.slug === parentSlug)
    if (main) main.subcategory_count = subs.length
    return HttpResponse.json({ ...created, parent: parentSlug }, { status: 201 })
  }),

  http.post(`${API}/admin/categories`, async ({ request }) => {
    if (!isStaff(resolveUserFromRequest(request) ?? undefined)) return errorResponse(403, 'forbidden', 'Khusus staf')
    const body = (await request.json()) as { name: string; description?: string }
    const slug = slugifyCategoryName(body.name)
    if (mockCategoryStore.some((c) => c.slug === slug)) {
      return errorResponse(409, 'exists', 'Kategori utama sudah ada')
    }
    mockCategoryStore.push({
      slug,
      name: body.name.trim(),
      description: body.description ?? '',
      subcategory_count: 0,
    })
    mockSubStore[slug] = []
    return HttpResponse.json({ slug }, { status: 201 })
  }),

  http.patch(`${API}/admin/categories/:slug`, async ({ request, params }) => {
    if (!isStaff(resolveUserFromRequest(request) ?? undefined)) return errorResponse(403, 'forbidden', 'Khusus staf')
    const body = (await request.json()) as { name?: string; description?: string }
    const cat = mockCategoryStore.find((c) => c.slug === params.slug)
    if (!cat) return errorResponse(404, 'not_found', 'Kategori tidak ditemukan')
    if (body.name) cat.name = body.name.trim()
    if (body.description !== undefined) cat.description = body.description
    return HttpResponse.json({ slug: cat.slug })
  }),

  http.delete(`${API}/admin/categories/:slug`, ({ request, params }) => {
    if (!isStaff(resolveUserFromRequest(request) ?? undefined)) return errorResponse(403, 'forbidden', 'Khusus staf')
    const idx = mockCategoryStore.findIndex((c) => c.slug === params.slug)
    if (idx >= 0) {
      mockCategoryStore.splice(idx, 1)
      delete mockSubStore[String(params.slug)]
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // Quests
  http.get(`${API}/quests`, () => HttpResponse.json(mockQuestCatalog)),

  http.get(`${API}/me/quests`, ({ request }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Belum masuk')
    return HttpResponse.json({ items: mockQuestStore })
  }),

  http.post(`${API}/me/quests/:slug/claim`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const slug = String(params.slug)
    const quest = mockQuestStore.find((q) => q.slug === slug)
    if (!quest) return errorResponse(404, 'not_found', 'Quest tidak ditemukan')
    if (!quest.complete) return errorResponse(400, 'incomplete', 'Quest belum selesai')
    if (quest.claimed) return errorResponse(409, 'claimed', 'Hadiah sudah diklaim')
    quest.claimed = true
    quest.claimable = false
    return HttpResponse.json({
      claimed: true,
      reward_reputation: quest.reward_reputation,
      reward_badge: quest.reward_badge,
    })
  }),

  http.get(`${API}/me/journey`, ({ request }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Belum masuk')
    return HttpResponse.json(mockJourneyNext)
  }),

  http.post(`${API}/admin/quests`, async ({ request }) => {
    if (!isStaff(resolveUserFromRequest(request) ?? undefined)) return errorResponse(403, 'forbidden', 'Khusus staf')
    const body = (await request.json()) as Record<string, unknown>
    const slug = String(body.slug ?? '')
    if (mockQuestStore.some((q) => q.slug === slug)) {
      return errorResponse(409, 'exists', 'Slug quest sudah ada')
    }
    const steps = (body.steps as Array<{ id: string; title: string; type: string; target?: string | number | null; description?: string }>) ?? []
    const row = {
      slug,
      title: String(body.title ?? ''),
      description: String(body.description ?? ''),
      steps: steps.map((s) => ({ ...s, done: false })),
      progress: { done: 0, total: steps.length },
      reward_reputation: Number(body.reward_reputation ?? 0),
      reward_badge: (body.reward_badge as string | null) ?? null,
      complete: false,
      claimed: false,
      claimable: false,
    }
    mockQuestStore.push(row)
    mockQuestCatalog.push({
      slug: row.slug,
      title: row.title,
      description: row.description,
      steps_count: steps.length,
      reward_reputation: row.reward_reputation,
    })
    return HttpResponse.json({ slug }, { status: 201 })
  }),

  http.patch(`${API}/admin/quests/:slug`, async ({ request, params }) => {
    if (!isStaff(resolveUserFromRequest(request) ?? undefined)) return errorResponse(403, 'forbidden', 'Khusus staf')
    const body = (await request.json()) as Record<string, unknown>
    const quest = mockQuestStore.find((q) => q.slug === params.slug)
    if (!quest) return errorResponse(404, 'not_found', 'Quest tidak ditemukan')
    if (body.title !== undefined) quest.title = String(body.title)
    if (body.description !== undefined) quest.description = String(body.description)
    if (body.reward_reputation !== undefined) quest.reward_reputation = Number(body.reward_reputation)
    if (body.reward_badge !== undefined) quest.reward_badge = (body.reward_badge as string | null) ?? null
    if (body.steps !== undefined) {
      const steps = body.steps as typeof quest.steps
      quest.steps = steps.map((s) => ({ ...s, done: s.done ?? false }))
      quest.progress = { done: quest.steps.filter((s) => s.done).length, total: quest.steps.length }
      quest.complete = quest.progress.done === quest.progress.total && quest.progress.total > 0
      quest.claimable = quest.complete && !quest.claimed
    }
    const cat = mockQuestCatalog.find((c) => c.slug === params.slug)
    if (cat) {
      if (body.title !== undefined) cat.title = quest.title
      if (body.description !== undefined) cat.description = quest.description
      if (body.reward_reputation !== undefined) cat.reward_reputation = quest.reward_reputation
      if (body.steps !== undefined) cat.steps_count = quest.steps.length
    }
    return HttpResponse.json({ slug: String(params.slug) })
  }),

  // Activity tracking
  http.post(`${API}/track`, async ({ request }) => {
    const body = (await request.json()) as { events?: unknown[] }
    const user = resolveUserFromRequest(request)
    if (user) {
      const settings = getMockUserSettings(user.id)
      if (!settings.privacy.activity_tracking) {
        return HttpResponse.json({ ok: true, stored: 0 })
      }
    }
    const count = Math.min((body.events ?? []).length, 50)
    return HttpResponse.json({ ok: true, stored: count })
  }),

  http.get(`${API}/me/activity-summary`, ({ request }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Belum masuk')
    return HttpResponse.json(mockActivitySummary)
  }),

  // Micro learning & streak
  http.get(`${API}/micro/daily`, ({ request }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Belum masuk')
    return HttpResponse.json(getMockDailyMicro())
  }),

  http.get(`${API}/micro/:slug`, ({ params }) => {
    const m = mockMicroStore.find((x) => x.slug === params.slug)
    if (!m) return errorResponse(404, 'not_found', 'Micro-lesson tidak ditemukan')
    return HttpResponse.json(m)
  }),

  http.post(`${API}/micro/:slug/complete`, async ({ request, params }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Belum masuk')
    const slug = String(params.slug)
    const m = mockMicroStore.find((x) => x.slug === slug)
    if (!m) return errorResponse(404, 'not_found', 'Micro-lesson tidak ditemukan')
    const body = (await request.json().catch(() => ({}))) as { answers?: number[] }
    const first = !isMicroComplete(slug)
    markMicroComplete(slug)

    let quizResult = null
    if (m.quiz.length > 0) {
      const answers = body.answers ?? []
      const keys = m.quiz.map((q) => ({
        answer_index: (q as { answer_index?: number }).answer_index ?? 0,
        explanation: (q as { explanation?: string }).explanation,
      }))
      const correct = m.quiz.reduce((n, q, i) => n + (keys[i]?.answer_index === answers[i] ? 1 : 0), 0)
      quizResult = {
        score: Math.round((correct / m.quiz.length) * 100),
        correct,
        total: m.quiz.length,
        review: m.quiz.map((q, i) => ({
          id: q.id,
          correct_index: keys[i]?.answer_index ?? 0,
          explanation: keys[i]?.explanation,
        })),
      }
    }

    if (mockStreak.weekly_done < mockStreak.weekly_goal) {
      mockStreak.weekly_done += 1
      mockStreak.active_today = true
      mockStreak.current_streak += 1
      const last = mockStreak.calendar[mockStreak.calendar.length - 1]
      if (last) last.active = true
    }

    return HttpResponse.json({ completed: true, first_completion: first, quiz: quizResult })
  }),

  http.get(`${API}/me/streak`, ({ request }) => {
    if (!resolveUserFromRequest(request)) return errorResponse(401, 'unauthorized', 'Belum masuk')
    return HttpResponse.json(mockStreak)
  }),

  http.get(`${API}/admin/micro`, ({ request }) => {
    if (!isStaff(resolveUserFromRequest(request) ?? undefined)) return errorResponse(403, 'forbidden', 'Khusus staf')
    return HttpResponse.json(
      mockMicroStore.map((m) => ({
        slug: m.slug,
        title: m.title,
        duration_min: m.duration_min,
        active: m.active ?? true,
        has_quiz: m.has_quiz,
      })),
    )
  }),

  http.get(`${API}/admin/micro/:slug`, ({ request, params }) => {
    if (!isStaff(resolveUserFromRequest(request) ?? undefined)) return errorResponse(403, 'forbidden', 'Khusus staf')
    const m = mockMicroStore.find((x) => x.slug === params.slug)
    if (!m) return errorResponse(404, 'not_found', 'Tidak ditemukan')
    const quiz = m.quiz.map((q, i) => ({
      ...q,
      answer_index: (q as { answer_index?: number }).answer_index ?? mockMicroQuizAnswers[m.slug]?.[i]?.answer_index ?? 0,
      explanation: (q as { explanation?: string }).explanation ?? mockMicroQuizAnswers[m.slug]?.[i]?.explanation,
    }))
    return HttpResponse.json({
      slug: m.slug,
      title: m.title,
      content_md: m.content_md,
      duration_min: m.duration_min,
      category_id: m.category_id ?? null,
      active: m.active ?? true,
      quiz,
      has_quiz: m.has_quiz,
    })
  }),

  http.post(`${API}/admin/micro`, async ({ request }) => {
    if (!isStaff(resolveUserFromRequest(request) ?? undefined)) return errorResponse(403, 'forbidden', 'Khusus staf')
    const body = (await request.json()) as Record<string, unknown>
    const slug = String(body.slug ?? '')
    if (mockMicroStore.some((m) => m.slug === slug)) {
      return errorResponse(409, 'exists', 'Slug sudah ada')
    }
    mockMicroStore.push({
      slug,
      title: String(body.title ?? ''),
      content_md: String(body.content_md ?? ''),
      duration_min: Number(body.duration_min ?? 5),
      has_quiz: Array.isArray(body.quiz) && body.quiz.length > 0,
      active: body.active !== false,
      category_id: (body.category_id as string | null) ?? null,
      quiz: (body.quiz as Array<{ id: string; question: string; options: string[]; answer_index?: number; explanation?: string }>) ?? [],
    })
    return HttpResponse.json({ slug }, { status: 201 })
  }),

  http.patch(`${API}/admin/micro/:slug`, async ({ request, params }) => {
    if (!isStaff(resolveUserFromRequest(request) ?? undefined)) return errorResponse(403, 'forbidden', 'Khusus staf')
    const body = (await request.json()) as Record<string, unknown>
    const m = mockMicroStore.find((x) => x.slug === params.slug)
    if (!m) return errorResponse(404, 'not_found', 'Tidak ditemukan')
    if (body.title !== undefined) m.title = String(body.title)
    if (body.content_md !== undefined) m.content_md = String(body.content_md)
    if (body.duration_min !== undefined) m.duration_min = Number(body.duration_min)
    if (body.active !== undefined) m.active = Boolean(body.active)
    if (body.category_id !== undefined) m.category_id = (body.category_id as string | null) ?? null
    if (body.quiz !== undefined) {
      m.quiz = body.quiz as typeof m.quiz
      m.has_quiz = m.quiz.length > 0
    }
    return HttpResponse.json({ slug: String(params.slug) })
  }),

  http.get(`${API}/teams`, ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.toLowerCase()
    const page = Number(url.searchParams.get('page') ?? 1)
    let items = mockTeams.filter((t) => t.visibility === 'public').map(teamSummaryOf)
    if (q) items = items.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    return HttpResponse.json(paginate(items, page))
  }),

  http.post(`${API}/teams`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const body = (await request.json()) as {
      name: string
      description?: string
      visibility?: string
      focus?: string
    }
    const slug = body.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const id = `team_${Date.now()}`
    mockTeams.unshift({
      id,
      slug,
      name: body.name.trim(),
      description: body.description ?? '',
      avatar_url: null,
      visibility: (body.visibility as 'public' | 'private') ?? 'public',
      created_by: user.id,
      focus: body.focus?.trim() || undefined,
      created_at: new Date().toISOString(),
    })
    mockTeamMembers.push({ team_id: id, user_id: user.id, role: 'owner' })
    return HttpResponse.json({ slug }, { status: 201 })
  }),

  http.get(`${API}/me/teams`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    return HttpResponse.json({ items: myTeamsOf(user.id) })
  }),

  http.get(`${API}/teams/:slug`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    const mem = user ? userMembership(t.id, user.id) : undefined
    if (t.visibility === 'private' && !mem) return errorResponse(403, 'private', 'Tim privat')
    return HttpResponse.json(teamDetailOf(t, user?.id))
  }),

  http.patch(`${API}/teams/:slug`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    const mem = userMembership(t.id, user.id)
    if (!mem || !['owner', 'co-owner', 'admin'].includes(mem.role)) return errorResponse(403, 'forbidden', 'Butuh owner/co-owner')
    const body = (await request.json()) as Record<string, unknown>
    if (body.name !== undefined) t.name = String(body.name)
    if (body.description !== undefined) t.description = String(body.description)
    if (body.visibility !== undefined) t.visibility = body.visibility as 'public' | 'private'
    return HttpResponse.json({ slug: t.slug })
  }),

  http.delete(`${API}/teams/:slug`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    const mem = userMembership(t.id, user.id)
    if (!mem || mem.role !== 'owner') return errorResponse(403, 'forbidden', 'Hanya owner')
    const idx = mockTeams.findIndex((x) => x.id === t.id)
    if (idx >= 0) mockTeams.splice(idx, 1)
    for (let i = mockTeamMembers.length - 1; i >= 0; i--) {
      if (mockTeamMembers[i].team_id === t.id) mockTeamMembers.splice(i, 1)
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.patch(`${API}/teams/:slug/members/:username`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    const me = userMembership(t.id, user.id)
    if (!me || !['owner', 'co-owner', 'admin'].includes(me.role)) return errorResponse(403, 'forbidden', 'Butuh owner/co-owner')
    const target = users.find((u) => u.username === params.username)
    const tm = target ? userMembership(t.id, target.id) : undefined
    if (!tm) return errorResponse(404, 'not_found', 'Bukan anggota')
    const body = (await request.json()) as { role: string }
    const newRole = body.role === 'admin' ? 'co-owner' : body.role
    if (newRole === 'owner') {
      if (me.role !== 'owner') return errorResponse(403, 'forbidden', 'Hanya owner')
      me.role = 'co-owner'
      tm.role = 'owner'
    } else if (me.role === 'owner') {
      tm.role = newRole as 'co-owner' | 'member'
    } else if (me.role === 'co-owner' || me.role === 'admin') {
      if (tm.role === 'owner' || newRole === 'owner') return errorResponse(403, 'forbidden', 'Co-owner tidak boleh menyentuh owner')
      tm.role = newRole as 'co-owner' | 'member'
    } else {
      return errorResponse(403, 'forbidden', 'Tidak boleh mengubah peran')
    }
    return HttpResponse.json({ role: normalizeMockRole(tm.role) })
  }),

  http.delete(`${API}/teams/:slug/members/:username`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    const target = users.find((u) => u.username === params.username)
    const tmIdx = mockTeamMembers.findIndex(
      (m) => m.team_id === t.id && m.user_id === target?.id,
    )
    if (tmIdx < 0) return errorResponse(404, 'not_found', 'Bukan anggota')
    const tm = mockTeamMembers[tmIdx]
    if (target?.id !== user.id) {
      const me = userMembership(t.id, user.id)
      if (!me || me.role !== 'owner') return errorResponse(403, 'forbidden', 'Hanya owner')
    }
    if (tm.role === 'owner') return errorResponse(400, 'use_leave', 'Gunakan POST /teams/{slug}/leave')
    mockTeamMembers.splice(tmIdx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/teams/:slug/invites`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    const me = userMembership(t.id, user.id)
    if (!me || me.role !== 'owner') return errorResponse(403, 'forbidden', 'Hanya owner')
    const body = (await request.json()) as { username: string }
    const target = users.find((u) => u.username === body.username)
    if (!target) return errorResponse(404, 'not_found', 'Pengguna tidak ditemukan')
    if (userMembership(t.id, target.id)) return errorResponse(409, 'member', 'Sudah anggota')
    const id = `tiv_${Date.now()}`
    mockTeamInvites.push({ id, team_id: t.id, user_id: target.id, invited_by: user.id, status: 'pending' })
    return HttpResponse.json({ id }, { status: 201 })
  }),

  http.get(`${API}/me/team-invites`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const items = mockTeamInvites
      .filter((i) => i.user_id === user.id && i.status === 'pending')
      .map((i) => {
        const t = mockTeams.find((x) => x.id === i.team_id)!
        return { id: i.id, team: { slug: t.slug, name: t.name } }
      })
    return HttpResponse.json({ items })
  }),

  http.post(`${API}/me/team-invites/:id/accept`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const inv = mockTeamInvites.find((i) => i.id === params.id && i.user_id === user.id)
    if (!inv || inv.status !== 'pending') return errorResponse(404, 'not_found', 'Undangan tidak valid')
    inv.status = 'accepted'
    if (!userMembership(inv.team_id, user.id)) {
      mockTeamMembers.push({ team_id: inv.team_id, user_id: user.id, role: 'member' })
    }
    return HttpResponse.json({ joined: true })
  }),

  http.post(`${API}/me/team-invites/:id/decline`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const inv = mockTeamInvites.find((i) => i.id === params.id && i.user_id === user.id)
    if (inv) inv.status = 'declined'
    return HttpResponse.json({ ok: true })
  }),

  http.post(`${API}/teams/:slug/join-request`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    if (t.visibility !== 'public') return errorResponse(403, 'private', 'Tim privat')
    if (userMembership(t.id, user.id)) return errorResponse(409, 'member', 'Sudah anggota')
    const id = `tjr_${Date.now()}`
    mockTeamJoinRequests.push({ id, team_id: t.id, user_id: user.id, status: 'pending' })
    return HttpResponse.json({ id }, { status: 201 })
  }),

  http.get(`${API}/teams/:slug/join-requests`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    const me = userMembership(t.id, user.id)
    if (!me || !['owner', 'co-owner', 'admin'].includes(me.role)) return errorResponse(403, 'forbidden', 'Butuh owner/co-owner')
    const items = mockTeamJoinRequests
      .filter((r) => r.team_id === t.id && r.status === 'pending')
      .map((r) => {
        const u = users.find((x) => x.id === r.user_id) ?? demoUser
        return { id: r.id, user: { username: u.username, name: u.name, avatar_url: u.avatar_url } }
      })
    return HttpResponse.json({ items })
  }),

  http.post(`${API}/teams/:slug/join-requests/:id/:decision`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    const me = userMembership(t.id, user.id)
    if (!me || !['owner', 'co-owner', 'admin'].includes(me.role)) return errorResponse(403, 'forbidden', 'Butuh owner/co-owner')
    const jr = mockTeamJoinRequests.find((r) => r.id === params.id && r.team_id === t.id)
    if (!jr || jr.status !== 'pending') return errorResponse(404, 'not_found', 'Permintaan tidak valid')
    if (params.decision === 'approve') {
      jr.status = 'approved'
      if (!userMembership(t.id, jr.user_id)) {
        mockTeamMembers.push({ team_id: t.id, user_id: jr.user_id, role: 'member' })
      }
    } else {
      jr.status = 'rejected'
    }
    return HttpResponse.json({ status: jr.status })
  }),

  http.post(`${API}/teams/:slug/leave`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    const meIdx = mockTeamMembers.findIndex((m) => m.team_id === t.id && m.user_id === user.id)
    if (meIdx < 0) return errorResponse(403, 'forbidden', 'Bukan anggota')
    const me = mockTeamMembers[meIdx]
    if (me.role === 'owner') {
      const others = mockTeamMembers.filter((m) => m.team_id === t.id && m.user_id !== user.id)
      if (others.length === 0) {
        const idx = mockTeams.findIndex((x) => x.id === t.id)
        if (idx >= 0) mockTeams.splice(idx, 1)
        for (let i = mockTeamMembers.length - 1; i >= 0; i--) {
          if (mockTeamMembers[i].team_id === t.id) mockTeamMembers.splice(i, 1)
        }
        return HttpResponse.json({ left: true, team_deleted: true })
      }
      const successor = others.find((m) => m.role === 'co-owner') ?? others[0]
      successor.role = 'owner'
      me.role = 'co-owner'
      mockTeamMembers.splice(meIdx, 1)
      const su = users.find((u) => u.id === successor.user_id) ?? demoUser
      return HttpResponse.json({ left: true, successor: { username: su.username, name: su.name } })
    }
    mockTeamMembers.splice(meIdx, 1)
    return HttpResponse.json({ left: true })
  }),

  http.post(`${API}/teams/:slug/transfer`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    const me = userMembership(t.id, user.id)
    if (!me || me.role !== 'owner') return errorResponse(403, 'forbidden', 'Hanya owner')
    const body = (await request.json()) as { username: string }
    const target = users.find((u) => u.username === body.username)
    const tm = target ? userMembership(t.id, target.id) : undefined
    if (!tm) return errorResponse(404, 'not_found', 'Bukan anggota')
    me.role = 'co-owner'
    tm.role = 'owner'
    return HttpResponse.json({ owner: { username: target!.username, name: target!.name } })
  }),

  http.get(`${API}/teams/:slug/channels`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    if (!userMembership(t.id, user.id)) return errorResponse(403, 'forbidden', 'Bukan anggota')
    const items = mockTeamChannels.filter((c) => c.team_id === t.id)
    if (!items.length) {
      const ch = { id: `ch_${Date.now()}`, team_id: t.id, name: 'umum', created_at: new Date().toISOString() }
      mockTeamChannels.push(ch)
      items.push(ch)
    }
    return HttpResponse.json({ items })
  }),

  http.post(`${API}/teams/:slug/channels`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    const me = userMembership(t.id, user.id)
    if (!me || !['owner', 'co-owner', 'admin'].includes(me.role)) return errorResponse(403, 'forbidden', 'Butuh co-owner')
    const body = (await request.json()) as { name?: string }
    const ch = { id: `ch_${Date.now()}`, team_id: t.id, name: body.name?.trim() || 'umum', created_at: new Date().toISOString() }
    mockTeamChannels.push(ch)
    return HttpResponse.json(ch, { status: 201 })
  }),

  http.get(`${API}/teams/:slug/channels/:cid/messages`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    if (!userMembership(t.id, user.id)) return errorResponse(403, 'forbidden', 'Bukan anggota')
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    const msgs = mockTeamMessages.filter((m) => m.channel_id === params.cid)
    const items = msgs.map((m) => {
      const u = users.find((x) => x.id === m.author_id) ?? demoUser
      const files = mockTeamFiles
        .filter((f) => f.message_id === m.id)
        .map((f) => ({
          id: f.id,
          filename: f.filename,
          download_url: `https://mock.psd.local/files/${f.id}`,
        }))
      return {
        id: m.id,
        body: m.body,
        author: { username: u.username, name: u.name, avatar_url: u.avatar_url },
        created_at: m.created_at,
        files,
      }
    })
    return HttpResponse.json({ items, total: items.length, page, page_size: 50 })
  }),

  http.post(`${API}/teams/:slug/channels/:cid/messages`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    if (!userMembership(t.id, user.id)) return errorResponse(403, 'forbidden', 'Bukan anggota')
    const body = (await request.json()) as { body?: string; file_ids?: string[] }
    if (!body.body?.trim() && !(body.file_ids?.length)) {
      return errorResponse(422, 'empty_message', 'Pesan tidak boleh kosong')
    }
    const id = mockTeamMessages.length ? Math.max(...mockTeamMessages.map((m) => m.id)) + 1 : 1
    const msg = {
      id,
      channel_id: String(params.cid),
      author_id: user.id,
      body: body.body ?? null,
      created_at: new Date().toISOString(),
    }
    mockTeamMessages.push(msg)
    for (const fid of body.file_ids ?? []) {
      const f = mockTeamFiles.find((x) => x.id === fid)
      if (f) {
        f.message_id = id
        f.channel_id = String(params.cid)
      }
    }
    const files = mockTeamFiles
      .filter((f) => f.message_id === id)
      .map((f) => ({ id: f.id, filename: f.filename, download_url: `https://mock.psd.local/files/${f.id}` }))
    return HttpResponse.json(
      {
        id,
        body: msg.body,
        author: { username: user.username, name: user.name, avatar_url: user.avatar_url },
        created_at: msg.created_at,
        files,
      },
      { status: 201 },
    )
  }),

  http.post(`${API}/teams/:slug/files/presign`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    if (!userMembership(t.id, user.id)) return errorResponse(403, 'forbidden', 'Bukan anggota')
    const body = (await request.json()) as { filename: string }
    const key = `teams/${t.id}/${Date.now()}_${body.filename}`
    return HttpResponse.json({
      upload_url: `https://mock.psd.local/upload/${encodeURIComponent(key)}`,
      storage_key: key,
      filename: body.filename,
    })
  }),

  http.post(`${API}/teams/:slug/files`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    if (!userMembership(t.id, user.id)) return errorResponse(403, 'forbidden', 'Bukan anggota')
    const body = (await request.json()) as {
      filename: string
      size_bytes: number
      storage_key: string
      channel_id?: string
    }
    if (body.size_bytes > 25 * 1024 * 1024) return errorResponse(413, 'file_too_large', 'Terlalu besar')
    const ext = body.filename.split('.').pop()?.toLowerCase()
    if (ext && ['exe', 'sh', 'bat'].includes(ext)) return errorResponse(415, 'blocked_type', 'Tipe diblokir')
    const f = {
      id: `tf_${Date.now()}`,
      team_id: t.id,
      channel_id: body.channel_id,
      uploader_id: user.id,
      filename: body.filename,
      size_bytes: body.size_bytes,
      storage_key: body.storage_key,
      created_at: new Date().toISOString(),
    }
    mockTeamFiles.push(f)
    return HttpResponse.json(
      {
        ...f,
        uploader: { username: user.username, name: user.name },
        download_url: `https://mock.psd.local/files/${f.id}`,
      },
      { status: 201 },
    )
  }),

  http.get(`${API}/teams/:slug/files`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    if (!userMembership(t.id, user.id)) return errorResponse(403, 'forbidden', 'Bukan anggota')
    const items = mockTeamFiles
      .filter((f) => f.team_id === t.id)
      .map((f) => {
        const u = users.find((x) => x.id === f.uploader_id) ?? demoUser
        return {
          ...f,
          uploader: { username: u.username, name: u.name },
          download_url: `https://mock.psd.local/files/${f.id}`,
        }
      })
    return HttpResponse.json({ items })
  }),

  http.get(`${API}/teams/:slug/assets`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    if (!userMembership(t.id, user.id)) return errorResponse(403, 'forbidden', 'Bukan anggota')
    return HttpResponse.json({ items: [] })
  }),

  http.post(`${API}/teams/:slug/assets`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const t = findTeam(String(params.slug))
    if (!t) return errorResponse(404, 'not_found', 'Tim tidak ditemukan')
    if (!userMembership(t.id, user.id)) return errorResponse(403, 'forbidden', 'Bukan anggota')
    const body = (await request.json()) as { kind: string }
    const paths: Record<string, string> = {
      project: '/projects/new',
      dataset: '/datasets/new',
      model: '/models/new',
      notebook: '/notebooks/new',
      idea_space: '/idea-rooms',
      data_factory: '/factory/sources',
      transformer_space: '/factory/pipelines',
      model_registry: '/ml',
      synthetic_data: '/synthesis',
      analytics_space: '/analytics',
      competition: '/competitions',
    }
    const base = paths[body.kind] ?? '/projects/new'
    const direct = ['project', 'dataset', 'model', 'notebook'].includes(body.kind)
    const url = direct ? `${base}?team_id=${t.id}` : `${base}?team_id=${t.id}&create=1`
    return HttpResponse.json({ kind: body.kind, create_url: url }, { status: 201 })
  }),

  http.get(`${API}/me/synthesis/quota`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    return HttpResponse.json(mockSynthQuota(user.id))
  }),

  http.post(`${API}/synthesis/jobs`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const body = (await request.json()) as { prompt?: string; spec?: Record<string, unknown>; n_rows: number }
    if (!body.spec && !body.prompt) return errorResponse(422, 'no_input', 'Beri prompt atau spec')
    const quota = mockSynthQuota(user.id)
    if (!body.spec && quota.plans_left <= 0) {
      return errorResponse(429, 'quota_exceeded', 'Kuota sintesis harian habis')
    }
    const job = createMockJob(body)
    return HttpResponse.json({ job_id: job.id, status: job.status }, { status: 202 })
  }),

  http.get(`${API}/synthesis/jobs/:id`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const job = mockSynthJobs.find((j) => j.id === params.id)
    if (!job) return errorResponse(404, 'not_found', 'Job tidak ditemukan')
    return HttpResponse.json(mockJobStatus(job))
  }),

  http.get(`${API}/me/synthesis/jobs`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    return HttpResponse.json({
      items: mockSynthJobs.map((j) => mockJobStatus(j)),
    })
  }),

  http.post(`${API}/synthesis/jobs/:id/publish`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const job = mockSynthJobs.find((j) => j.id === params.id)
    if (!job || job.status !== 'done') return errorResponse(400, 'not_ready', 'Job belum selesai')
    const body = (await request.json()) as { name?: string; visibility?: string }
    const slug = `${user.username}/${(body.name ?? 'dataset-sintesis').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    job.dataset_slug = slug
    return HttpResponse.json({ dataset_slug: slug })
  }),

  http.get(`${API}/idea-rooms`, ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const page = Number(url.searchParams.get('page') ?? 1)
    let items = mockRooms.filter((r) => r._visibility === 'public').map(roomSummaryOf)
    if (status) items = items.filter((r) => r.status === status)
    return HttpResponse.json(paginate(items, page))
  }),

  http.post(`${API}/idea-rooms/upload-cover`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const fd = await request.formData()
    const file = fd.get('file')
    if (!(file instanceof File)) return errorResponse(422, 'invalid_file', 'File wajib')
    const cover_url = `https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop&sig=${Date.now()}`
    return HttpResponse.json({ cover_url })
  }),

  http.post(`${API}/idea-rooms`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const body = (await request.json()) as {
      title: string
      pitch_md?: string
      cover_url?: string | null
      visibility?: string
      max_members?: number
    }
    const slug = body.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    mockRooms.unshift({
      slug,
      title: body.title.trim(),
      pitch_md: body.pitch_md ?? '',
      cover_url: body.cover_url ?? null,
      status: 'draft',
      member_count: 1,
      max_members: body.max_members ?? null,
      framing_deadline: null,
      category: null,
      subcategory: null,
      team_slug: slug,
      my_role: 'owner',
      components_count: 0,
      members: [{ username: user.username, name: user.name, avatar_url: user.avatar_url, role: 'owner' }],
      _teamId: `team_${Date.now()}`,
      _visibility: (body.visibility as 'public' | 'private') ?? 'public',
      _founderId: user.id,
    })
    return HttpResponse.json({ slug }, { status: 201 })
  }),

  http.get(`${API}/idea-rooms/:slug`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    const r = findMockRoom(String(params.slug))
    if (!r) return errorResponse(404, 'not_found', 'Ruang tidak ditemukan')
    const detail = roomDetailForViewer(r, user?.id)
    if (!detail) return errorResponse(403, 'private', 'Ruang privat')
    return HttpResponse.json(detail)
  }),

  http.post(`${API}/idea-rooms/:slug/publish`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const r = findMockRoom(String(params.slug))
    if (!r) return errorResponse(404, 'not_found', 'Ruang tidak ditemukan')
    if (r.status !== 'draft') return errorResponse(400, 'invalid_state', 'Hanya draft')
    r.status = 'open'
    return HttpResponse.json({ status: 'open' })
  }),

  http.post(`${API}/idea-rooms/:slug/start-framing`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const r = findMockRoom(String(params.slug))
    if (!r) return errorResponse(404, 'not_found', 'Ruang tidak ditemukan')
    if (r.status !== 'open') return errorResponse(400, 'invalid_state', 'Harus open')
    const body = (await request.json()) as { framing_hours?: number }
    const hours = body.framing_hours ?? 72
    r.status = 'framing'
    r.framing_deadline = new Date(Date.now() + hours * 3600_000).toISOString()
    return HttpResponse.json({ status: 'framing', framing_deadline: r.framing_deadline })
  }),

  http.post(`${API}/idea-rooms/:slug/close`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const r = findMockRoom(String(params.slug))
    if (!r) return errorResponse(404, 'not_found', 'Ruang tidak ditemukan')
    r.status = 'closed'
    return HttpResponse.json({ status: 'closed' })
  }),

  http.post(`${API}/idea-rooms/:slug/join`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const r = findMockRoom(String(params.slug))
    if (!r) return errorResponse(404, 'not_found', 'Ruang tidak ditemukan')
    if (!['open', 'framing'].includes(r.status)) return errorResponse(400, 'closed', 'Pendaftaran tertutup')
    if (r._visibility === 'private') return errorResponse(403, 'private', 'Ruang privat')
    if (r.max_members != null && r.member_count >= r.max_members) return errorResponse(409, 'full', 'Penuh')
    if (!r.members?.some((m) => m.username === user.username)) {
      r.members = [...(r.members ?? []), { username: user.username, name: user.name, avatar_url: user.avatar_url, role: 'member' }]
      r.member_count += 1
    }
    return HttpResponse.json({ joined: true })
  }),

  http.get(`${API}/idea-rooms/:slug/components`, ({ params }) => {
    const items = mockRoomComponents[String(params.slug)] ?? []
    return HttpResponse.json({ items })
  }),

  http.post(`${API}/idea-rooms/:slug/components`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const r = findMockRoom(String(params.slug))
    if (!r || r.status !== 'framing') return errorResponse(400, 'invalid_state', 'Bukan framing')
    const body = (await request.json()) as { kind: string; content_md: string }
    const id = `pcm_${Date.now()}`
    const comp = {
      id,
      kind: body.kind as 'context',
      content_md: body.content_md,
      author: { username: user.username, avatar_url: user.avatar_url },
    }
    if (!mockRoomComponents[r.slug]) mockRoomComponents[r.slug] = []
    mockRoomComponents[r.slug].push(comp)
    r.components_count = (r.components_count ?? 0) + 1
    return HttpResponse.json({ id }, { status: 201 })
  }),

  http.delete(`${API}/idea-rooms/:slug/components/:cid`, ({ params }) => {
    const list = mockRoomComponents[String(params.slug)]
    if (list) {
      const idx = list.findIndex((c) => c.id === params.cid)
      if (idx >= 0) list.splice(idx, 1)
    }
    const r = findMockRoom(String(params.slug))
    if (r) r.components_count = Math.max(0, (r.components_count ?? 1) - 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/idea-rooms/:slug/frame-problem`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const slug = String(params.slug)
    const r = findMockRoom(slug)
    if (!r) return errorResponse(404, 'not_found', 'Ruang tidak ditemukan')
    if (r.status !== 'closed') return errorResponse(400, 'invalid_state', 'Harus closed')
    const comps = mockRoomComponents[slug] ?? []
    if (!comps.length) return errorResponse(400, 'no_components', 'Belum ada komponen')
    const q = mockSynthQuota(user.id)
    if (q.plans_left <= 0) return errorResponse(429, 'quota_exceeded', 'Kuota AI habis')
    const existing = mockRoomProblems[slug]
    const problem = existing ?? {
      statement_md: `Masalah diramu dari ${comps.length} komponen untuk "${r.title}".`,
      suggested_metric: 'Metrik utama sesuai tujuan tim',
      data_kind: 'structured' as const,
      data_spec: {
        name: `data-${slug}`,
        description: 'Dataset sintesis dari ruang ide',
        columns: [
          { name: 'id', dtype: 'id', params: {} },
          { name: 'fitur_a', dtype: 'float', params: {} },
          { name: 'label', dtype: 'category', params: { values: ['ya', 'tidak'] } },
        ],
      },
      unstructured_guidance_md: null,
      generated_by: 'ai',
    }
    mockRoomProblems[slug] = problem
    return HttpResponse.json(problem)
  }),

  http.get(`${API}/idea-rooms/:slug/problem`, ({ params }) => {
    const problem = mockRoomProblems[String(params.slug)]
    if (!problem) return errorResponse(404, 'not_found', 'Masalah belum diramu')
    return HttpResponse.json(problem)
  }),

  http.patch(`${API}/idea-rooms/:slug/problem`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const slug = String(params.slug)
    const problem = mockRoomProblems[slug]
    if (!problem) return errorResponse(404, 'not_found', 'Masalah belum diramu')
    const body = (await request.json()) as Record<string, unknown>
    const updated = { ...problem, ...body, generated_by: 'manual' }
    mockRoomProblems[slug] = updated
    return HttpResponse.json(updated)
  }),

  http.post(`${API}/idea-rooms/:slug/generate-data`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const slug = String(params.slug)
    const r = findMockRoom(slug)
    if (!r) return errorResponse(404, 'not_found', 'Ruang tidak ditemukan')
    if (r.status !== 'closed') return errorResponse(400, 'invalid_state', 'Harus closed')
    const problem = mockRoomProblems[slug]
    if (!problem) return errorResponse(400, 'no_problem', 'Ramu masalah dulu')
    const body = (await request.json()) as {
      data_mode?: string
      n_rows?: number
      secondary_dataset_slug?: string
    }
    const mode = body.data_mode

    if (problem.data_kind === 'unstructured' || mode === 'collect') {
      r.data_mode = 'collect'
      r.status = 'solving'
      return HttpResponse.json({ status: 'solving', data_mode: 'collect' })
    }
    if (mode === 'secondary') {
      const ds = body.secondary_dataset_slug
      if (!ds) return errorResponse(404, 'not_found', 'Dataset tidak ditemukan')
      r.data_mode = 'secondary'
      r.dataset_repo_slug = ds
      r.status = 'solving'
      return HttpResponse.json({ status: 'solving', data_mode: 'secondary' })
    }
    r.data_mode = 'synthetic'
    r.status = 'generating'
    r.generation_error = null
    mockRoomGeneratingAt[slug] = Date.now()
    return HttpResponse.json({ status: 'generating', data_mode: 'synthetic' })
  }),

  http.get(`${API}/idea-rooms/:slug/solution-template`, ({ params }) => {
    const slug = String(params.slug)
    if (!findMockRoom(slug)) return errorResponse(404, 'not_found', 'Ruang tidak ditemukan')
    return HttpResponse.json(mockRoomTemplates[slug] ?? DEFAULT_SOLUTION_TEMPLATE)
  }),

  http.patch(`${API}/idea-rooms/:slug/solution-template`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const slug = String(params.slug)
    const body = (await request.json()) as { template?: typeof DEFAULT_SOLUTION_TEMPLATE }
    mockRoomTemplates[slug] = body.template ?? DEFAULT_SOLUTION_TEMPLATE
    return HttpResponse.json(mockRoomTemplates[slug])
  }),

  http.post(`${API}/idea-rooms/:slug/upload-data`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const slug = String(params.slug)
    const r = findMockRoom(slug)
    if (!r || r.status !== 'solving' || r.data_mode !== 'collect') {
      return errorResponse(400, 'invalid_state', 'Hanya collect solving')
    }
    const ds = `${r.team_slug}/data-uploaded`
    r.dataset_repo_slug = ds
    return HttpResponse.json({ dataset_slug: ds }, { status: 201 })
  }),

  http.post(`${API}/idea-rooms/:slug/submit`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const slug = String(params.slug)
    const r = findMockRoom(slug)
    if (!r || r.status !== 'solving') return errorResponse(400, 'invalid_state', 'Harus solving')
    const body = (await request.json()) as {
      notebook_id?: string
      result_summary_md?: string
      asset_refs?: { type: string; slug: string }[]
      metrics?: Record<string, unknown>
    }
    mockRoomSubmissions[slug] = {
      result_summary_md: body.result_summary_md ?? '',
      notebook_id: body.notebook_id ?? null,
      asset_refs: body.asset_refs ?? [],
      metrics: body.metrics ?? {},
      submitted_by: user.id,
    }
    r.status = 'submitted'
    return HttpResponse.json({ id: `rsb_${Date.now()}`, status: 'submitted' }, { status: 201 })
  }),

  http.get(`${API}/idea-rooms/:slug/submission`, ({ params }) => {
    const sub = mockRoomSubmissions[String(params.slug)]
    if (!sub) return errorResponse(404, 'not_found', 'Belum ada submission')
    return HttpResponse.json(sub)
  }),

  http.post(`${API}/idea-rooms/:slug/finish`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const slug = String(params.slug)
    const r = findMockRoom(slug)
    if (!r || r.status !== 'submitted') return errorResponse(400, 'invalid_state', 'Harus submitted')
    r.status = 'finished'
    if (!mockRoomAssets[slug]?.length && r.dataset_repo_slug) {
      mockRoomAssets[slug] = [
        {
          type: 'dataset',
          slug: r.dataset_repo_slug,
          name: r.dataset_repo_slug.split('/').pop() ?? 'dataset',
          visibility: 'private',
          synthetic: r.data_mode === 'synthetic',
        },
      ]
    }
    return HttpResponse.json({ status: 'finished' })
  }),

  http.get(`${API}/idea-rooms/by-id/:roomId`, ({ params }) => {
    const roomId = String(params.roomId)
    const r = mockRooms.find((room) => room._teamId === roomId || room.slug === roomId)
    if (!r) return errorResponse(404, 'not_found', 'Ruang tidak ditemukan')
    return HttpResponse.json({ slug: r.slug, title: r.title })
  }),

  http.get(`${API}/idea-rooms/:slug/assets`, ({ params }) => {
    const items = mockRoomAssets[String(params.slug)] ?? []
    return HttpResponse.json({ items })
  }),

  http.post(`${API}/idea-rooms/:slug/publish-assets`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const slug = String(params.slug)
    const body = (await request.json()) as { assets?: { type: string; slug: string }[]; visibility?: string }
    const list = mockRoomAssets[slug] ?? []
    for (const ref of body.assets ?? []) {
      const item = list.find((a) => a.slug === ref.slug)
      if (item && body.visibility) item.visibility = body.visibility
    }
    return HttpResponse.json({ published: body.assets ?? [] })
  }),

  http.post(`${API}/idea-rooms/:slug/challenge`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const slug = String(params.slug)
    const r = findMockRoom(slug)
    if (!r || r.status !== 'finished') return errorResponse(400, 'invalid_state', 'Harus finished')
    const body = (await request.json()) as { title?: string; sponsor?: string; metric?: string; duration_days?: number }
    const cslug = `tantangan-${slug}`.slice(0, 40)
    r.status = 'challenged'
    r.competition_slug = cslug
    if (!competitions.some((c) => c.slug === cslug)) {
      const now = new Date()
      const days = body.duration_days ?? 14
      competitions.push({
        slug: cslug,
        title: body.title ?? `Tantangan: ${r.title}`,
        sponsor: body.sponsor ?? null,
        status: 'active',
        metric: body.metric ?? 'RMSE',
        participants: 0,
        prize_pool: null,
        starts_at: now.toISOString(),
        ends_at: new Date(now.getTime() + days * 86400_000).toISOString(),
        cover_url: null,
      })
    }
    return HttpResponse.json({ competition_slug: cslug, status: 'challenged' }, { status: 201 })
  }),

  http.get(`${API}/hub/transformer`, () => {
    return HttpResponse.json(mockTransformerHub())
  }),

  http.get(`${API}/collections`, ({ request }) => {
    const url = new URL(request.url)
    const featured = url.searchParams.get('featured')
    const category = url.searchParams.get('category')
    const page = Number(url.searchParams.get('page') ?? '1')
    let items = mockCollections.map((c) => ({
      slug: c.slug,
      title: c.title,
      cover_url: c.cover_url,
      is_featured: c.is_featured,
      count: resolveMockCollectionItems(c.raw_items).length,
    }))
    if (featured === 'true') items = items.filter((c) => c.is_featured)
    if (featured === 'false') items = items.filter((c) => !c.is_featured)
    if (category) items = items.filter((c) => findMockCollection(c.slug)?.category_slug === category)
    const pageSize = 12
    const total = items.length
    const start = (page - 1) * pageSize
    return HttpResponse.json({
      items: items.slice(start, start + pageSize),
      total,
      page,
      page_size: pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    })
  }),

  http.get(`${API}/collections/:slug`, ({ params }) => {
    const detail = mockCollectionDetail(String(params.slug))
    if (!detail) return errorResponse(404, 'not_found', 'Koleksi tidak ditemukan')
    return HttpResponse.json(detail)
  }),

  http.post(`${API}/collections`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Khusus staf')
    const body = (await request.json()) as {
      title: string
      description_md?: string
      cover_url?: string | null
      category?: string | null
      is_featured?: boolean
      items?: { type: string; slug?: string; id?: string }[]
    }
    const base = body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const slug = mockCollections.some((c) => c.slug === base) ? `${base}-${Date.now().toString(36).slice(-4)}` : base
    mockCollections.unshift({
      slug,
      title: body.title,
      cover_url: body.cover_url ?? null,
      is_featured: !!body.is_featured,
      count: body.items?.length ?? 0,
      description_md: body.description_md ?? '',
      category_slug: body.category ?? 'transformer',
      raw_items: body.items ?? [],
    })
    return HttpResponse.json({ slug }, { status: 201 })
  }),

  http.patch(`${API}/collections/:slug`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Khusus staf')
    const c = findMockCollection(String(params.slug))
    if (!c) return errorResponse(404, 'not_found', 'Koleksi tidak ditemukan')
    const body = (await request.json()) as Record<string, unknown>
    if (typeof body.title === 'string') c.title = body.title
    if (typeof body.description_md === 'string') c.description_md = body.description_md
    if ('cover_url' in body) c.cover_url = (body.cover_url as string | null) ?? null
    if (typeof body.is_featured === 'boolean') c.is_featured = body.is_featured
    if (Array.isArray(body.items)) c.raw_items = body.items as typeof c.raw_items
    if (typeof body.category === 'string') c.category_slug = body.category
    c.count = resolveMockCollectionItems(c.raw_items).length
    return HttpResponse.json({ slug: c.slug })
  }),

  http.delete(`${API}/collections/:slug`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Khusus staf')
    const idx = mockCollections.findIndex((c) => c.slug === String(params.slug))
    if (idx >= 0) mockCollections.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/data-sources`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    return HttpResponse.json({ items: sourcesForUser(user.id) })
  }),

  http.post(`${API}/data-sources`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const body = (await request.json()) as { dataset_slug?: string; name?: string }
    const slug = body.dataset_slug
    const repo = repos.find((r) => r.slug === slug && r.kind === 'dataset')
    if (!repo) return errorResponse(404, 'not_found', 'Dataset tidak ditemukan')
    const id = `src_${Date.now().toString(36)}`
    const entry = {
      id,
      name: body.name || repo.name,
      uri: `psd://dataset/${repo.slug}`,
      kind: 'dataset',
      owner_id: user.id,
    }
    mockDataSources.unshift(entry)
    return HttpResponse.json({ id: entry.id, uri: entry.uri }, { status: 201 })
  }),

  http.delete(`${API}/data-sources/:sid`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const idx = mockDataSources.findIndex((s) => s.id === String(params.sid) && s.owner_id === user.id)
    if (idx >= 0) mockDataSources.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/data-sources/:sid/schema`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const src = mockDataSources.find((s) => s.id === String(params.sid) && s.owner_id === user.id)
    if (!src) return errorResponse(404, 'not_found', 'Sumber tidak ditemukan')
    return HttpResponse.json({
      columns: [
        { name: 'rating', type: 'INTEGER' },
        { name: 'text', type: 'VARCHAR' },
        { name: 'kategori', type: 'VARCHAR' },
        { name: 'bulan', type: 'VARCHAR' },
      ],
    })
  }),

  http.get(`${API}/pipelines`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = 12
    const items = pipelinesForUser(user.id).map(pipelineSummaryOf)
    const total = items.length
    const start = (page - 1) * pageSize
    return HttpResponse.json({
      items: items.slice(start, start + pageSize),
      total,
      page,
      page_size: pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    })
  }),

  http.post(`${API}/pipelines`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const body = (await request.json()) as { title: string; spec?: { nodes: unknown[]; edges: unknown[] } }
    const base = body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const slug = mockPipelines.some((p) => p.slug === base) ? `${base}-${Date.now().toString(36).slice(-4)}` : base
    const spec = (body.spec as { nodes: []; edges: [] }) ?? { nodes: [], edges: [] }
    let errors = validatePipelineSpec(spec, DEFAULT_MAX_NODES)
    for (const n of spec.nodes ?? []) {
      if (n.type === 'source') {
        const sid = (n.params as { source_id?: string })?.source_id
        if (sid && !mockDataSources.some((s) => s.id === sid)) {
          errors = [...errors, `Sumber tidak ditemukan untuk node '${n.id}'`]
        }
      }
    }
    const status = errors.length ? 'error' : spec.nodes?.length ? 'valid' : 'draft'
    mockPipelines.unshift({
      id: `pl_${Date.now().toString(36)}`,
      slug,
      title: body.title,
      status: status as 'draft' | 'valid' | 'error',
      spec,
      validation_error: errors.length ? errors.join('; ') : null,
      team_id: null,
      room_id: null,
      owner_id: user.id,
    })
    return HttpResponse.json({ slug, status }, { status: 201 })
  }),

  http.get(`${API}/pipelines/:slug`, ({ params }) => {
    const pl = findMockPipeline(String(params.slug))
    if (!pl) return errorResponse(404, 'not_found', 'Pipeline tidak ditemukan')
    return HttpResponse.json({
      id: pl.id,
      slug: pl.slug,
      title: pl.title,
      status: pl.status,
      spec: pl.spec,
      validation_error: pl.validation_error,
      team_id: pl.team_id,
      room_id: pl.room_id,
    })
  }),

  http.patch(`${API}/pipelines/:slug`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const pl = findMockPipeline(String(params.slug))
    if (!pl || pl.owner_id !== user.id) return errorResponse(403, 'forbidden', 'Tidak berhak')
    const body = (await request.json()) as { title?: string; spec?: { nodes: []; edges: [] } }
    if (body.title) pl.title = body.title
    if (body.spec) pl.spec = body.spec
    let errors = validatePipelineSpec(pl.spec ?? { nodes: [], edges: [] }, DEFAULT_MAX_NODES)
    for (const n of pl.spec?.nodes ?? []) {
      if (n.type === 'source') {
        const sid = (n.params as { source_id?: string })?.source_id
        if (sid && !mockDataSources.some((s) => s.id === sid)) {
          errors = [...errors, `Sumber tidak ditemukan untuk node '${n.id}'`]
        }
      }
    }
    pl.status = errors.length ? 'error' : pl.spec?.nodes?.length ? 'valid' : 'draft'
    pl.validation_error = errors.length ? errors.join('; ') : null
    return HttpResponse.json({ slug: pl.slug, status: pl.status, errors })
  }),

  http.post(`${API}/pipelines/:slug/validate`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const pl = findMockPipeline(String(params.slug))
    if (!pl) return errorResponse(404, 'not_found', 'Pipeline tidak ditemukan')
    let errors = validatePipelineSpec(pl.spec ?? { nodes: [], edges: [] }, DEFAULT_MAX_NODES)
    for (const n of pl.spec?.nodes ?? []) {
      if (n.type === 'source') {
        const sid = (n.params as { source_id?: string })?.source_id
        if (sid && !mockDataSources.some((s) => s.id === sid)) {
          errors = [...errors, `Sumber tidak ditemukan untuk node '${n.id}'`]
        }
      }
    }
    pl.status = errors.length ? 'error' : pl.spec?.nodes?.length ? 'valid' : 'draft'
    pl.validation_error = errors.length ? errors.join('; ') : null
    return HttpResponse.json({ status: pl.status, errors })
  }),

  http.delete(`${API}/pipelines/:slug`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const idx = mockPipelines.findIndex((p) => p.slug === String(params.slug) && p.owner_id === user.id)
    if (idx >= 0) mockPipelines.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/me/factory/quota`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    return HttpResponse.json({
      runs_per_day: 5,
      max_rows: 50_000,
      max_nodes: 8,
      runs_used_today: getRunsUsedToday(user.id),
    })
  }),

  http.post(`${API}/pipelines/:slug/run`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const slug = String(params.slug)
    const pl = findMockPipeline(slug)
    if (!pl || pl.owner_id !== user.id) return errorResponse(404, 'not_found', 'Pipeline tidak ditemukan')
    if (pl.status !== 'valid') return errorResponse(400, 'invalid', 'Pipeline belum valid')
    if (getRunsUsedToday(user.id) >= 5) {
      return errorResponse(429, 'quota_exceeded', 'Kuota run harian habis. Naik tier untuk lebih banyak.')
    }
    const run = createMockRun(slug, user.id)
    return HttpResponse.json({ run_id: run.id, status: run.status }, { status: 202 })
  }),

  http.get(`${API}/pipelines/:slug/runs`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    const slug = String(params.slug)
    return HttpResponse.json({ items: runsForPipeline(slug, user?.id) })
  }),

  http.get(`${API}/pipelines/:slug/runs/:runId`, ({ params }) => {
    const run = findMockRun(String(params.runId))
    if (!run || run.pipeline_slug !== String(params.slug)) {
      return errorResponse(404, 'not_found', 'Run tidak ditemukan')
    }
    return HttpResponse.json(mockRunDetail(run))
  }),

  http.get(`${API}/pipelines/:slug/runs/:runId/download`, ({ params, request }) => {
    const run = findMockRun(String(params.runId))
    if (!run) return errorResponse(404, 'not_found', 'Run tidak ditemukan')
    const url = new URL(request.url)
    const uri = url.searchParams.get('uri') ?? ''
    const allowed = Object.values(run.layers).flat().some((item) => item.uri === uri)
    if (!allowed) return errorResponse(403, 'forbidden', 'URI tidak termasuk run ini')
    return HttpResponse.json({ url: `https://example.com/download?uri=${encodeURIComponent(uri)}` })
  }),

  http.post(`${API}/dashboards`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const body = (await request.json()) as {
      title: string
      description_md?: string
      pipeline_id?: string
      visibility?: 'private' | 'public'
    }
    const base = body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const slug = mockDashboards.some((d) => d.slug === base) ? `${base}-${Date.now().toString(36).slice(-4)}` : base
    mockDashboards.unshift({
      id: `dsh_${Date.now().toString(36)}`,
      slug,
      title: body.title,
      description_md: body.description_md ?? '',
      visibility: body.visibility ?? 'private',
      pipeline_id: body.pipeline_id ?? null,
      owner_id: user.id,
      layout: [],
      widgets: [],
    })
    return HttpResponse.json({ slug }, { status: 201 })
  }),

  http.get(`${API}/dashboards`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = 12
    const items = dashboardsForUser(user.id).map(dashboardSummaryOf)
    const total = items.length
    const start = (page - 1) * pageSize
    return HttpResponse.json({
      items: items.slice(start, start + pageSize),
      total,
      page,
      page_size: pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    })
  }),

  http.get(`${API}/dashboards/:slug`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    const d = findMockDashboard(String(params.slug))
    if (!d) return errorResponse(404, 'not_found', 'Dashboard tidak ditemukan')
    if (d.visibility !== 'public' && (!user || d.owner_id !== user.id)) {
      return errorResponse(403, 'private', 'Dashboard privat')
    }
    const { id: _id, owner_id, ...rest } = d
    return HttpResponse.json({ ...rest, owner_id })
  }),

  http.patch(`${API}/dashboards/:slug`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const d = findMockDashboard(String(params.slug))
    if (!d) return errorResponse(404, 'not_found', 'Dashboard tidak ditemukan')
    if (d.owner_id !== user.id) return errorResponse(403, 'forbidden', 'Tidak berhak menyunting dashboard')
    const body = (await request.json()) as Record<string, unknown>
    if (body.title != null) d.title = String(body.title)
    if (body.description_md != null) d.description_md = String(body.description_md)
    if (body.visibility != null) d.visibility = body.visibility as 'private' | 'public'
    if (body.pipeline_id !== undefined) d.pipeline_id = body.pipeline_id as string | null
    if (body.layout != null) d.layout = body.layout as Record<string, unknown>[]
    return HttpResponse.json({ slug: d.slug })
  }),

  http.delete(`${API}/dashboards/:slug`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const idx = mockDashboards.findIndex((d) => d.slug === params.slug && d.owner_id === user.id)
    if (idx >= 0) mockDashboards.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/dashboards/:slug/widgets`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const d = findMockDashboard(String(params.slug))
    if (!d || d.owner_id !== user.id) return errorResponse(404, 'not_found', 'Dashboard tidak ditemukan')
    const body = (await request.json()) as {
      kind: string
      title?: string
      query?: Record<string, unknown>
      options?: Record<string, unknown>
    }
    const id = `wdg_${Date.now().toString(36)}`
    d.widgets.push({
      id,
      kind: body.kind as 'kpi',
      title: body.title ?? '',
      query: body.query ?? {},
      options: body.options,
    })
    return HttpResponse.json({ id }, { status: 201 })
  }),

  http.patch(`${API}/dashboards/:slug/widgets/:wid`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const d = findMockDashboard(String(params.slug))
    if (!d || d.owner_id !== user.id) return errorResponse(404, 'not_found', 'Dashboard tidak ditemukan')
    const w = d.widgets.find((x) => x.id === params.wid)
    if (!w) return errorResponse(404, 'not_found', 'Widget tidak ditemukan')
    const body = (await request.json()) as Record<string, unknown>
    if (body.kind != null) w.kind = body.kind as typeof w.kind
    if (body.title != null) w.title = String(body.title)
    if (body.query != null) w.query = body.query as Record<string, unknown>
    if (body.options != null) w.options = body.options as Record<string, unknown>
    return HttpResponse.json({ id: w.id })
  }),

  http.delete(`${API}/dashboards/:slug/widgets/:wid`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
    const d = findMockDashboard(String(params.slug))
    if (d && d.owner_id === user.id) {
      d.widgets = d.widgets.filter((w) => w.id !== params.wid)
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/dashboards/:slug/widgets/:wid/data`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    const d = findMockDashboard(String(params.slug))
    if (!d) return errorResponse(404, 'not_found', 'Dashboard tidak ditemukan')
    if (d.visibility !== 'public' && (!user || d.owner_id !== user.id)) {
      return errorResponse(403, 'private', 'Dashboard privat')
    }
    const w = d.widgets.find((x) => x.id === params.wid)
    if (!w) return errorResponse(404, 'not_found', 'Widget tidak ditemukan')
    return HttpResponse.json(mockWidgetData(w, d.pipeline_id))
  }),

  // Langkah 52 — JupyterHub
  http.get(`${API_ROOT}/api/hub/config`, () =>
    HttpResponse.json({
      hub_url: 'https://hub.projeksainsdata.com',
      enabled: true,
      spawn_path: '/hub/spawn',
    }),
  ),

  http.get(`${API_ROOT}/api/hub/launch`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    return HttpResponse.redirect('http://localhost:3000/notebooks/workspace', 302)
  }),

  // Langkah 57 — Asisten & feed personal
  http.get(`${API_ROOT}/api/assistant/panel`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    return HttpResponse.json(mockAssistantPanel(user.id))
  }),

  http.get(`${API_ROOT}/api/assistant/conversations`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    return HttpResponse.json(mockListConversations(user.id))
  }),

  http.post(`${API_ROOT}/api/assistant/conversations`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    return HttpResponse.json(mockNewConversation(user.id))
  }),

  http.get(`${API_ROOT}/api/assistant/conversations/:id`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    try {
      return HttpResponse.json(mockGetConversation(user.id, String(params.id)))
    } catch {
      return errorResponse(404, 'not_found', 'Percakapan tidak ditemukan')
    }
  }),

  http.delete(`${API_ROOT}/api/assistant/conversations/:id`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    try {
      mockDeleteConversation(user.id, String(params.id))
      return HttpResponse.json({ ok: true })
    } catch {
      return errorResponse(404, 'not_found', 'Percakapan tidak ditemukan')
    }
  }),

  http.post(`${API_ROOT}/api/assistant/conversations/:id/messages`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const body = (await request.json()) as { content?: string; context?: Record<string, string> | null }
    try {
      const result = mockSendMessage(user.id, String(params.id), body.content ?? '', body.context)
      return HttpResponse.json({ reply: result.reply, panel: result.panel })
    } catch (e) {
      const err = e as Error & { status?: number; reset_at?: string }
      if (err.message === 'quota_exhausted' || err.status === 429) {
        return errorResponse(429, 'quota_exhausted', 'Kuota chat Anda habis untuk jendela ini.')
      }
      if (err.message === 'not_found') {
        return errorResponse(404, 'not_found', 'Percakapan tidak ditemukan')
      }
      return errorResponse(500, 'assistant_error', 'Gagal mengirim pesan')
    }
  }),

  http.get(`${API_ROOT}/api/assistant/quota`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    return HttpResponse.json(mockAssistantQuota())
  }),

  http.post(`${API_ROOT}/api/assistant/ask`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const body = (await request.json()) as { question?: string; context?: Record<string, string> | null }
    return HttpResponse.json(mockAssistantAsk(body.question ?? '', body.context))
  }),

  http.get(`${API_ROOT}/api/feed`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    return HttpResponse.json(mockPersonalizedFeed())
  }),

  // Langkah 59 — unsubscribe email (token di URL, tanpa sesi)
  http.get(`${API_ROOT}/email/unsubscribe`, ({ request }) => {
    const token = new URL(request.url).searchParams.get('token')
    if (!token || token.length < 8) {
      return new HttpResponse(null, { status: 400 })
    }
    return new HttpResponse(null, { status: 200 })
  }),

  // Pengaduan platform & laporan konten
  http.post(`${API}/support/tickets`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const body = (await request.json()) as Record<string, string>
    const result = mockCreateTicket(user.id, body)
    if (result.error) return errorResponse(result.error.status, result.error.code, result.error.message)
    return HttpResponse.json(result.data, { status: 201 })
  }),

  http.get(`${API}/support/tickets/me`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    return HttpResponse.json(mockMyTickets(user.id))
  }),

  http.get(`${API}/support/tickets/:id`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const isStaff = user.role === 'superadmin' || user.role === 'moderator'
    const result = mockGetTicket(String(params.id), user.id, isStaff)
    if (result.error) return errorResponse(result.error.status, result.error.code, result.error.message)
    return HttpResponse.json(result.data)
  }),

  http.post(`${API}/support/tickets/:id/messages`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const body = (await request.json()) as { body?: string }
    const isStaff = user.role === 'superadmin' || user.role === 'moderator'
    const result = mockReplyTicket(String(params.id), user.id, user.username, body.body ?? '', isStaff)
    if (result.error) return errorResponse(result.error.status, result.error.code, result.error.message)
    return HttpResponse.json(result.data, { status: 201 })
  }),

  http.get(`${API}/admin/support/tickets`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || (user.role !== 'superadmin' && user.role !== 'moderator')) {
      return errorResponse(403, 'forbidden', 'Hanya staf.')
    }
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const page_size = Number(url.searchParams.get('page_size') ?? 20)
    const status = url.searchParams.get('status')
    const priority = url.searchParams.get('priority')
    let items = mockAdminListTickets()
    if (status) items = items.filter((t) => t.status === status)
    if (priority) items = items.filter((t) => t.priority === priority)
    return HttpResponse.json(paginate(items, page, page_size))
  }),

  http.post(`${API}/admin/support/tickets/:id/:action`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || (user.role !== 'superadmin' && user.role !== 'moderator')) {
      return errorResponse(403, 'forbidden', 'Hanya staf.')
    }
    const action = String(params.action)
    if (!['assign', 'resolve', 'close', 'reopen'].includes(action)) {
      return errorResponse(404, 'not_found', 'Aksi tidak dikenal')
    }
    const result = mockAdminTicketAction(String(params.id), action)
    if (result.error) return errorResponse(result.error.status, result.error.code, result.error.message)
    return HttpResponse.json(result.data)
  }),

  http.post(`${API}/reports`, async ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    const body = (await request.json()) as Record<string, string>
    const result = mockReportContent(user.id, body)
    if (result.error) return errorResponse(result.error.status, result.error.code, result.error.message)
    return HttpResponse.json(result.data)
  }),

  http.get(`${API}/reports/me`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user) return errorResponse(401, 'unauthorized', 'Anda harus masuk.')
    return HttpResponse.json(mockMyReports(user.id))
  }),

  http.get(`${API}/admin/reports`, ({ request }) => {
    const user = resolveUserFromRequest(request)
    if (!user || (user.role !== 'superadmin' && user.role !== 'moderator')) {
      return errorResponse(403, 'forbidden', 'Hanya staf.')
    }
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const page_size = Number(url.searchParams.get('page_size') ?? 50)
    const flagged = url.searchParams.get('flagged')
    const status = url.searchParams.get('status')
    let items = mockAdminListReports({
      ...(flagged === 'true' ? { flagged: true } : {}),
      ...(status ? { status } : {}),
    })
    return HttpResponse.json(paginate(items, page, page_size))
  }),

  http.post(`${API}/admin/reports/:id/start-review`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || (user.role !== 'superadmin' && user.role !== 'moderator')) {
      return errorResponse(403, 'forbidden', 'Hanya staf.')
    }
    const result = mockAdminStartReview(String(params.id))
    if (result.error) return errorResponse(result.error.status, result.error.code, result.error.message)
    return HttpResponse.json(result.data)
  }),

  http.post(`${API}/admin/reports/:id/resolve`, async ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || (user.role !== 'superadmin' && user.role !== 'moderator')) {
      return errorResponse(403, 'forbidden', 'Hanya staf.')
    }
    const body = (await request.json()) as { decision?: string }
    const result = mockAdminResolveReport(String(params.id), body.decision ?? '')
    if (result.error) return errorResponse(result.error.status, result.error.code, result.error.message)
    return HttpResponse.json(result.data)
  }),

  http.post(`${API}/admin/reports/:id/reopen`, ({ request, params }) => {
    const user = resolveUserFromRequest(request)
    if (!user || (user.role !== 'superadmin' && user.role !== 'moderator')) {
      return errorResponse(403, 'forbidden', 'Hanya staf.')
    }
    const result = mockAdminReopenReport(String(params.id))
    if (result.error) return errorResponse(result.error.status, result.error.code, result.error.message)
    return HttpResponse.json(result.data)
  }),
]
