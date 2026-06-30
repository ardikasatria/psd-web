import { demoUser, users } from './users'

export type MockTeam = {
  id: string
  slug: string
  name: string
  description: string
  avatar_url: string | null
  visibility: 'public' | 'private'
  created_by: string
  focus?: string
  assets_count?: number
  competitions_count?: number
}

export type MockTeamMember = {
  team_id: string
  user_id: string
  role: 'owner' | 'co-owner' | 'admin' | 'member'
}

export type MockTeamInvite = {
  id: string
  team_id: string
  user_id: string
  invited_by: string
  status: 'pending' | 'accepted' | 'declined'
}

export type MockTeamJoinRequest = {
  id: string
  team_id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
}

export const mockTeams: MockTeam[] = [
  {
    id: 'team_ds_lampung',
    slug: 'ds-lampung',
    name: 'DS Lampung',
    description: 'Tim data science komunitas Lampung — proyek UMKM, NLP, dan computer vision. Aktif di kompetisi regional.',
    avatar_url: null,
    visibility: 'public',
    created_by: demoUser.id,
    focus: 'UMKM & NLP',
    assets_count: 12,
    competitions_count: 4,
  },
  {
    id: 'team_itera_nlp',
    slug: 'itera-nlp-squad',
    name: 'Itera NLP Squad',
    description: 'Squad NLP Institut Teknologi Sumatera — fokus sentimen, NER, dan benchmark kompetisi Bahasa Indonesia.',
    avatar_url: null,
    visibility: 'public',
    created_by: users[1]?.id ?? demoUser.id,
    focus: 'Kompetisi NLP',
    assets_count: 8,
    competitions_count: 6,
  },
  {
    id: 'team_umkm_analytics',
    slug: 'umkm-analytics',
    name: 'UMKM Analytics Collective',
    description: 'Kolektif praktisi analytics untuk UMKM — dataset terbuka, model forecasting, dan studi kasus nyata.',
    avatar_url: null,
    visibility: 'public',
    created_by: users[2]?.id ?? demoUser.id,
    focus: 'UMKM',
    assets_count: 15,
    competitions_count: 2,
  },
  {
    id: 'team_tabular',
    slug: 'tabular-crushers',
    name: 'Tabular Crushers',
    description: 'Tim kompetisi tabular data — XGBoost, feature engineering, dan leaderboard chasing dengan disiplin tinggi.',
    avatar_url: null,
    visibility: 'public',
    created_by: demoUser.id,
    focus: 'Kompetisi',
    assets_count: 6,
    competitions_count: 9,
  },
  {
    id: 'team_psd_core',
    slug: 'psd-core',
    name: 'PSD Core',
    description: 'Tim inti platform PSD untuk pengembangan fitur dan dokumentasi.',
    avatar_url: null,
    visibility: 'private',
    created_by: users[1]?.id ?? demoUser.id,
    focus: 'Platform',
    assets_count: 20,
    competitions_count: 0,
  },
]

export const mockTeamMembers: MockTeamMember[] = [
  { team_id: 'team_ds_lampung', user_id: demoUser.id, role: 'owner' },
  { team_id: 'team_ds_lampung', user_id: users[1]?.id ?? demoUser.id, role: 'co-owner' },
  { team_id: 'team_ds_lampung', user_id: users[2]?.id ?? demoUser.id, role: 'member' },
  { team_id: 'team_itera_nlp', user_id: users[1]?.id ?? demoUser.id, role: 'owner' },
  { team_id: 'team_itera_nlp', user_id: users[2]?.id ?? demoUser.id, role: 'member' },
  { team_id: 'team_umkm_analytics', user_id: users[2]?.id ?? demoUser.id, role: 'owner' },
  { team_id: 'team_umkm_analytics', user_id: demoUser.id, role: 'member' },
  { team_id: 'team_tabular', user_id: demoUser.id, role: 'owner' },
  { team_id: 'team_tabular', user_id: users[1]?.id ?? demoUser.id, role: 'co-owner' },
  { team_id: 'team_psd_core', user_id: users[1]?.id ?? demoUser.id, role: 'owner' },
]

export const mockTeamInvites: MockTeamInvite[] = [
  {
    id: 'tiv_demo',
    team_id: 'team_ds_lampung',
    user_id: users[2]?.id ?? demoUser.id,
    invited_by: demoUser.id,
    status: 'pending',
  },
]

export const mockTeamJoinRequests: MockTeamJoinRequest[] = [
  {
    id: 'tjr_demo',
    team_id: 'team_ds_lampung',
    user_id: users[2]?.id ?? demoUser.id,
    status: 'pending',
  },
]

export type MockTeamChannel = { id: string; team_id: string; name: string; created_at: string }
export type MockTeamMessage = {
  id: number
  channel_id: string
  author_id: string
  body: string | null
  created_at: string
  file_ids?: string[]
}
export type MockTeamFile = {
  id: string
  team_id: string
  channel_id?: string
  message_id?: number
  uploader_id: string
  filename: string
  size_bytes: number
  storage_key: string
  created_at: string
}


export const mockTeamChannels: MockTeamChannel[] = [
  { id: 'ch_umum_ds', team_id: 'team_ds_lampung', name: 'umum', created_at: new Date().toISOString() },
]

export const mockTeamMessages: MockTeamMessage[] = [
  {
    id: 1,
    channel_id: 'ch_umum_ds',
    author_id: demoUser.id,
    body: 'Selamat datang di diskusi tim DS Lampung!',
    created_at: new Date().toISOString(),
  },
]

export const mockTeamFiles: MockTeamFile[] = []

export function normalizeMockRole(role: string) {
  return role === 'admin' ? 'co-owner' : role
}

export function findTeam(slug: string) {
  return mockTeams.find((t) => t.slug === slug)
}

export function teamMembersOf(teamId: string) {
  return mockTeamMembers.filter((m) => m.team_id === teamId)
}

export function memberCount(teamId: string) {
  return teamMembersOf(teamId).length
}

export function userMembership(teamId: string, userId: string) {
  return mockTeamMembers.find((m) => m.team_id === teamId && m.user_id === userId)
}

export function teamDetailOf(t: MockTeam, viewerId?: string) {
  const mem = viewerId ? userMembership(t.id, viewerId) : undefined
  const members = teamMembersOf(t.id).map((m) => {
    const u = users.find((x) => x.id === m.user_id) ?? demoUser
    return {
      username: u.username,
      name: u.name,
      avatar_url: u.avatar_url,
      role: normalizeMockRole(m.role),
    }
  })
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    avatar_url: t.avatar_url,
    visibility: t.visibility,
    my_role: mem ? normalizeMockRole(mem.role) : null,
    members,
  }
}

export function teamSummaryOf(t: MockTeam) {
  const members = teamMembersOf(t.id)
    .slice(0, 4)
    .map((m) => {
      const u = users.find((x) => x.id === m.user_id) ?? demoUser
      return { username: u.username, avatar_url: u.avatar_url }
    })
  return {
    slug: t.slug,
    name: t.name,
    description: t.description,
    avatar_url: t.avatar_url,
    member_count: memberCount(t.id),
    focus: t.focus,
    assets_count: t.assets_count,
    competitions_count: t.competitions_count,
    member_preview: members,
  }
}

export function myTeamsOf(userId: string) {
  return mockTeamMembers
    .filter((m) => m.user_id === userId)
    .map((m) => {
      const t = mockTeams.find((x) => x.id === m.team_id)!
      return { id: t.id, slug: t.slug, name: t.name, avatar_url: t.avatar_url, role: normalizeMockRole(m.role) }
    })
}
