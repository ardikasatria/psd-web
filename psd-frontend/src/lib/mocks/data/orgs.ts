import { demoUser, users } from './users'
import { resolveAssetLevel, validateHandle } from '@/lib/orgs/org-utils'
import type { OrgType } from '@/lib/orgs/org-utils'

export type MockOrg = {
  id: string
  handle: string
  name: string
  type: OrgType
  verification: 'unverified' | 'pending' | 'verified' | 'rejected'
  base_permission: string | null
  description: string | null
  created_by: string
  suspended?: boolean
  created_at?: string
}

export type MockOrgMember = {
  org_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'billing_manager'
  joined_at?: string
}

export type MockOrgTeam = {
  id: string
  org_id: string
  name: string
}

export type MockOrgTeamMember = {
  team_id: string
  user_id: string
}

export type MockOrgAsset = {
  id: string
  org_id: string
  kind: string
  title: string
  path: string
}

export type MockOrgGrant = {
  id: number
  org_id: string
  asset_id: string
  team_id: string | null
  user_id: string | null
  level: string
}

export type MockOpportunity = {
  id: string
  org_id: string
  title: string
  description: string
  skills: string[]
  status: 'open' | 'closed'
  created_at: string
}

export type MockOrgVerification = {
  id: string
  org_id: string
  status: string
  doc_keys: string[]
  note: string | null
  submitted_at: string
}

export type MockOrgApplication = {
  id: string
  org_id: string
  opportunity_id: string
  applicant_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

export type MockOrgAnnouncement = {
  id: string
  org_id: string
  author_id: string
  body_md: string
  images: string[]
  visibility: 'public' | 'private'
  created_at: string
  updated_at?: string | null
}

export const mockOrgs: MockOrg[] = [
  {
    id: 'org_umkm_batik',
    handle: 'umkm-batik-lampung',
    name: 'UMKM Batik Lampung',
    type: 'umkm',
    verification: 'verified',
    base_permission: 'read',
    description: 'Koperasi batik tradisional Lampung — mencari talenta data untuk forecasting penjualan dan analitik pasar.',
    created_by: demoUser.id,
    created_at: '2025-01-10T00:00:00Z',
  },
  {
    id: 'org_itera_lab',
    handle: 'itera-cs-lab',
    name: 'Itera CS Lab',
    type: 'academic',
    verification: 'verified',
    base_permission: 'read',
    description: 'Laboratorium ilmu komputer ITERA — riset NLP, computer vision, dan kolaborasi industri.',
    created_by: users[1]?.id ?? demoUser.id,
    created_at: '2024-11-05T00:00:00Z',
  },
  {
    id: 'org_psd_comm',
    handle: 'psd-community',
    name: 'PSD Community',
    type: 'community',
    verification: 'unverified',
    base_permission: 'read',
    description: 'Komunitas terbuka pengguna platform Projek Sains Data.',
    created_by: demoUser.id,
    created_at: '2025-02-01T00:00:00Z',
  },
  {
    id: 'org_enterprise_ai',
    handle: 'nusantara-ai',
    name: 'Nusantara AI',
    type: 'enterprise',
    verification: 'pending',
    base_permission: 'triage',
    description: 'Perusahaan AI enterprise — menunggu verifikasi KYC untuk memasang peluang rekrutmen.',
    created_by: users[2]?.id ?? demoUser.id,
    created_at: '2025-03-01T00:00:00Z',
  },
  {
    id: 'org_personal',
    handle: 'personal-adit',
    name: 'Personal Adit',
    type: 'personal',
    verification: 'unverified',
    base_permission: null,
    description: 'Organisasi personal untuk eksperimen proyek.',
    created_by: demoUser.id,
  },
  {
    id: 'org_suspended',
    handle: 'spam-org-demo',
    name: 'Spam Org Demo',
    type: 'community',
    verification: 'rejected',
    base_permission: null,
    description: 'Org contoh yang ditangguhkan admin.',
    created_by: users[2]?.id ?? demoUser.id,
    suspended: true,
  },
]

export const mockOrgMembers: MockOrgMember[] = [
  { org_id: 'org_umkm_batik', user_id: demoUser.id, role: 'owner' },
  { org_id: 'org_umkm_batik', user_id: users[1]?.id ?? demoUser.id, role: 'admin' },
  { org_id: 'org_umkm_batik', user_id: users[2]?.id ?? demoUser.id, role: 'member' },
  { org_id: 'org_itera_lab', user_id: users[1]?.id ?? demoUser.id, role: 'owner' },
  { org_id: 'org_itera_lab', user_id: demoUser.id, role: 'member' },
  { org_id: 'org_psd_comm', user_id: demoUser.id, role: 'admin' },
  { org_id: 'org_psd_comm', user_id: users[1]?.id ?? demoUser.id, role: 'member' },
  { org_id: 'org_enterprise_ai', user_id: users[2]?.id ?? demoUser.id, role: 'owner' },
  { org_id: 'org_enterprise_ai', user_id: demoUser.id, role: 'billing_manager' },
  { org_id: 'org_personal', user_id: demoUser.id, role: 'owner' },
  { org_id: 'org_suspended', user_id: users[2]?.id ?? demoUser.id, role: 'owner' },
]

export const mockOrgTeams: MockOrgTeam[] = [
  { id: 'ot_data', org_id: 'org_umkm_batik', name: 'Tim Data' },
  { id: 'ot_ops', org_id: 'org_umkm_batik', name: 'Operasional' },
  { id: 'ot_nlp', org_id: 'org_itera_lab', name: 'NLP Research' },
]

export const mockOrgTeamMembers: MockOrgTeamMember[] = [
  { team_id: 'ot_data', user_id: demoUser.id },
  { team_id: 'ot_data', user_id: users[2]?.id ?? demoUser.id },
  { team_id: 'ot_ops', user_id: users[1]?.id ?? demoUser.id },
  { team_id: 'ot_nlp', user_id: demoUser.id },
]

export const mockOrgAssets: MockOrgAsset[] = [
  {
    id: 'oa_batik_ds',
    org_id: 'org_umkm_batik',
    kind: 'dataset',
    title: 'Dataset Penjualan Batik',
    path: '/datasets/batik-sales',
  },
  {
    id: 'oa_batik_nb',
    org_id: 'org_umkm_batik',
    kind: 'notebook',
    title: 'Analisis Musiman',
    path: '/notebooks/batik-seasonal',
  },
  {
    id: 'oa_itera_model',
    org_id: 'org_itera_lab',
    kind: 'model',
    title: 'NER Bahasa Indonesia',
    path: '/models/id-ner',
  },
]

export const mockOrgGrants: MockOrgGrant[] = [
  { id: 1, org_id: 'org_umkm_batik', asset_id: 'oa_batik_ds', team_id: 'ot_data', user_id: null, level: 'write' },
  { id: 2, org_id: 'org_umkm_batik', asset_id: 'oa_batik_nb', team_id: null, user_id: users[2]?.id ?? demoUser.id, level: 'maintain' },
]

export const mockOpportunities: MockOpportunity[] = [
  {
    id: 'op_batik_ds',
    org_id: 'org_umkm_batik',
    title: 'Data Analyst Batik — Proyek 3 Bulan',
    description: 'Mencari analis data untuk membantu forecasting dan dashboard penjualan.',
    skills: ['Python', 'Pandas', 'SQL'],
    status: 'open',
    created_at: '2025-02-15T00:00:00Z',
  },
]

export const mockOrgVerifications: MockOrgVerification[] = [
  {
    id: 'vr_nusantara',
    org_id: 'org_enterprise_ai',
    status: 'pending',
    doc_keys: ['kyc/nusantara-ai/nib.pdf', 'kyc/nusantara-ai/npwp.pdf'],
    note: null,
    submitted_at: '2025-03-05T10:00:00Z',
  },
]

export const mockOrgApplications: MockOrgApplication[] = [
  {
    id: 'app_demo_1',
    org_id: 'org_umkm_batik',
    opportunity_id: 'op_batik_ds',
    applicant_id: users[1]?.id ?? demoUser.id,
    status: 'pending',
    created_at: '2025-02-20T00:00:00Z',
  },
]

export const mockOrgAnnouncements: MockOrgAnnouncement[] = [
  {
    id: 'ann_batik_public',
    org_id: 'org_umkm_batik',
    author_id: demoUser.id,
    body_md:
      '**Kebutuhan data analyst** — kami mencari talenta untuk membantu forecasting penjualan batik musiman. Lihat tab Peluang untuk detail lamaran.',
    images: [],
    visibility: 'public',
    created_at: '2025-03-01T09:00:00Z',
  },
  {
    id: 'ann_batik_private',
    org_id: 'org_umkm_batik',
    author_id: users[1]?.id ?? demoUser.id,
    body_md: 'Rapat tim data Jumat pukul 14:00 WIB — bahas pipeline dashboard internal.',
    images: [],
    visibility: 'private',
    created_at: '2025-03-10T11:30:00Z',
  },
  {
    id: 'ann_itera_public',
    org_id: 'org_itera_lab',
    author_id: users[1]?.id ?? demoUser.id,
    body_md: 'Open call kolaborasi riset NLP bahasa daerah — mahasiswa S2/S3 dipersilakan menghubungi lab.',
    images: [],
    visibility: 'public',
    created_at: '2025-02-28T08:00:00Z',
  },
  {
    id: 'ann_psd_public',
    org_id: 'org_psd_comm',
    author_id: demoUser.id,
    body_md: 'Hackathon komunitas PSD bulan depan — daftar via forum!',
    images: [],
    visibility: 'public',
    created_at: '2025-03-12T07:00:00Z',
  },
]

let grantIdCounter = mockOrgGrants.length + 1

export function findOrg(handleOrId: string) {
  return mockOrgs.find((o) => o.handle === handleOrId || o.id === handleOrId)
}

export function orgMembersOf(orgId: string) {
  return mockOrgMembers.filter((m) => m.org_id === orgId)
}

export function userOrgMembership(orgId: string, userId: string) {
  return mockOrgMembers.find((m) => m.org_id === orgId && m.user_id === userId)
}

export function myOrgsOf(userId: string) {
  return mockOrgMembers
    .filter((m) => m.user_id === userId)
    .map((m) => {
      const o = mockOrgs.find((x) => x.id === m.org_id)!
      return {
        id: o.id,
        handle: o.handle,
        name: o.name,
        type: o.type,
        verification: o.verification,
        role: m.role,
      }
    })
}

export function countOwners(orgId: string) {
  return orgMembersOf(orgId).filter((m) => m.role === 'owner').length
}

export function canRemoveMember(orgId: string, targetUserId: string) {
  const mem = userOrgMembership(orgId, targetUserId)
  if (!mem) return false
  if (mem.role === 'owner' && countOwners(orgId) <= 1) return false
  return true
}

export function canChangeRole(orgId: string, targetUserId: string, newRole: string) {
  const mem = userOrgMembership(orgId, targetUserId)
  if (!mem) return false
  if (mem.role === 'owner' && newRole !== 'owner' && countOwners(orgId) <= 1) return false
  return true
}

export function assetAccessForUser(orgId: string, assetId: string, userId: string) {
  const org = mockOrgs.find((o) => o.id === orgId)
  const mem = userOrgMembership(orgId, userId)
  const grants = mockOrgGrants.filter((g) => g.org_id === orgId && g.asset_id === assetId)
  const teamIds = mockOrgTeamMembers
    .filter((tm) => tm.user_id === userId)
    .map((tm) => tm.team_id)
  const teamLevels = grants.filter((g) => g.team_id && teamIds.includes(g.team_id)).map((g) => g.level)
  const direct = grants.find((g) => g.user_id === userId)?.level ?? null
  return resolveAssetLevel({
    role: mem?.role,
    orgBase: org?.base_permission,
    teamLevels,
    directLevel: direct,
  })
}

export function announcementsForViewer(orgId: string, viewerId?: string) {
  const isMember = viewerId ? !!userOrgMembership(orgId, viewerId) : false
  const items = mockOrgAnnouncements
    .filter((a) => a.org_id === orgId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  if (isMember) return items
  return items.filter((a) => a.visibility === 'public')
}

export function serializeAnnouncement(a: MockOrgAnnouncement) {
  const u = users.find((x) => x.id === a.author_id) ?? demoUser
  return {
    id: a.id,
    body_md: a.body_md,
    images: a.images,
    visibility: a.visibility,
    author: {
      user_id: a.author_id,
      username: u.username,
      name: u.name,
      avatar_url: u.avatar_url,
    },
    created_at: a.created_at,
    updated_at: a.updated_at ?? null,
  }
}

export function orgDetailOf(o: MockOrg, viewerId?: string) {
  const mem = viewerId ? userOrgMembership(o.id, viewerId) : undefined
  const members = orgMembersOf(o.id).map((m) => {
    const u = users.find((x) => x.id === m.user_id) ?? demoUser
    return {
      user_id: m.user_id,
      username: u.username,
      name: u.name,
      avatar_url: u.avatar_url,
      role: m.role,
      joined_at: m.joined_at ?? null,
    }
  })
  const teams = mockOrgTeams
    .filter((t) => t.org_id === o.id)
    .map((t) => ({
      id: t.id,
      name: t.name,
      member_count: mockOrgTeamMembers.filter((tm) => tm.team_id === t.id).length,
      members: mockOrgTeamMembers
        .filter((tm) => tm.team_id === t.id)
        .map((tm) => {
          const u = users.find((x) => x.id === tm.user_id) ?? demoUser
          return { user_id: tm.user_id, username: u.username, name: u.name }
        }),
    }))
  const assets = mockOrgAssets
    .filter((a) => a.org_id === o.id)
    .map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      path: a.path,
      my_access: viewerId ? assetAccessForUser(o.id, a.id, viewerId) : null,
    }))
  const opportunities = mockOpportunities.filter((op) => op.org_id === o.id)
  const announcements = announcementsForViewer(o.id, viewerId).map(serializeAnnouncement)
  const vr = mockOrgVerifications.find((v) => v.org_id === o.id && v.status === 'pending')
  return {
    id: o.id,
    handle: o.handle,
    name: o.name,
    type: o.type,
    verification: o.verification,
    description: o.description,
    base_permission: o.base_permission,
    suspended: o.suspended ?? false,
    my_role: mem?.role ?? null,
    members,
    teams,
    assets,
    opportunities,
    announcements,
    verification_request: vr
      ? { id: vr.id, status: vr.status, doc_keys: vr.doc_keys, note: vr.note }
      : null,
  }
}

export function adminOrgOf(o: MockOrg) {
  const owners = orgMembersOf(o.id).filter((m) => m.role === 'owner')
  const ownerUser = users.find((u) => u.id === owners[0]?.user_id) ?? demoUser
  return {
    id: o.id,
    handle: o.handle,
    name: o.name,
    type: o.type,
    verification: o.verification,
    member_count: orgMembersOf(o.id).length,
    owner_username: ownerUser.username,
    suspended: o.suspended ?? false,
    created_at: o.created_at ?? new Date().toISOString(),
  }
}

export function verificationQueueItems() {
  return mockOrgVerifications
    .filter((v) => v.status === 'pending')
    .map((v) => {
      const o = mockOrgs.find((x) => x.id === v.org_id)!
      return {
        id: v.id,
        org_id: o.id,
        org_handle: o.handle,
        org_name: o.name,
        org_type: o.type,
        status: v.status,
        doc_keys: v.doc_keys,
        doc_urls: v.doc_keys.map((key) => ({
          key,
          url: `https://mock-minio.local/presigned/${encodeURIComponent(key)}`,
        })),
        submitted_at: v.submitted_at,
      }
    })
}

export function createMockOrg(
  userId: string,
  body: { handle: string; name: string; type: string },
) {
  const err = validateHandle(body.handle)
  if (err) return { error: { status: 422, code: 'bad_handle', message: err } }
  if (mockOrgs.some((o) => o.handle === body.handle.trim().toLowerCase())) {
    return { error: { status: 409, code: 'duplicate_handle', message: 'Handle sudah dipakai.' } }
  }
  const id = `org_${Date.now()}`
  const org: MockOrg = {
    id,
    handle: body.handle.trim().toLowerCase(),
    name: body.name.trim(),
    type: body.type as OrgType,
    verification: 'unverified',
    base_permission: 'read',
    description: null,
    created_by: userId,
    created_at: new Date().toISOString(),
  }
  mockOrgs.unshift(org)
  mockOrgMembers.push({ org_id: id, user_id: userId, role: 'owner' })
  return { data: { id, handle: org.handle } }
}

export function nextGrantId() {
  return grantIdCounter++
}

export { validateHandle }
