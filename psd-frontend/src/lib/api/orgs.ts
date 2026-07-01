import {
  AccessLevelSchema,
  AdminOrgSchema,
  MyOrgSchema,
  OpportunitySchema,
  OrgApplicationSchema,
  OrgAnnouncementSchema,
  OrgAssetSchema,
  OrgDetailSchema,
  OrgGrantSchema,
  OrgSchema,
  OrgTeamSchema,
  OrgTypeSchema,
  OrgVerificationSchema,
  OrgVerificationQueueSchema,
  Paginated,
  PaginatedAdminOrgSchema,
  type AdminOrg,
  type OrgDetail,
  type PaginatedAdminOrg,
} from '@/types/api'
import { z } from 'zod'
import { apiDelete, apiFetch, buildQuery } from './client'

const OkSchema = z.object({ ok: z.boolean().optional() }).passthrough()

export const createOrg = (b: { handle: string; name: string; type: string }) =>
  apiFetch('/orgs', z.object({ id: z.string(), handle: z.string() }), {
    method: 'POST',
    body: JSON.stringify(b),
  })

const OrgBrowseSchema = z.object({
  id: z.string(),
  handle: z.string(),
  name: z.string(),
  type: OrgTypeSchema,
  verification: OrgVerificationSchema,
  description: z.string().optional(),
})

export const listOrgs = (q: { q?: string; type?: string; page?: number } = {}) =>
  apiFetch(`/orgs${buildQuery(q)}`, Paginated(OrgBrowseSchema))

const FeaturedOpportunitySchema = z.object({
  id: z.string(),
  title: z.string(),
  org_handle: z.string(),
  org_name: z.string(),
  skills: z.array(z.string()),
  created_at: z.string(),
})

export const listFeaturedOrgOpportunities = () =>
  apiFetch('/orgs/opportunities/featured', z.object({ items: z.array(FeaturedOpportunitySchema) }))

export const myOrgs = () => apiFetch('/orgs/me', z.object({ items: z.array(MyOrgSchema) }))

export const getOrg = (handle: string) => apiFetch<OrgDetail>(`/orgs/${handle}`, OrgDetailSchema)

export const leaveOrg = (id: string) =>
  apiFetch(`/orgs/${id}/leave`, OkSchema, { method: 'POST' })

export const inviteOrgMember = (id: string, username: string) =>
  apiFetch(`/orgs/${id}/members/invite`, OkSchema, {
    method: 'POST',
    body: JSON.stringify({ username }),
  })

export const setOrgRole = (id: string, uid: string, role: string) =>
  apiFetch(`/orgs/${id}/members/${uid}/role`, z.object({ role: z.string() }), {
    method: 'POST',
    body: JSON.stringify({ role }),
  })

export const removeOrgMember = (id: string, uid: string) => apiDelete(`/orgs/${id}/members/${uid}`)

export const createOrgTeam = (id: string, name: string) =>
  apiFetch(`/orgs/${id}/teams`, OrgTeamSchema, { method: 'POST', body: JSON.stringify({ name }) })

export const addOrgTeamMember = (id: string, teamId: string, userId: string) =>
  apiFetch(`/orgs/${id}/teams/${teamId}/members`, OkSchema, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  })

export const listOrgAssets = (id: string) =>
  apiFetch(`/orgs/${id}/assets`, z.object({ items: z.array(OrgAssetSchema) }))

export const createOrgAsset = (id: string, kind: string) =>
  apiFetch(`/orgs/${id}/assets`, OrgAssetSchema, { method: 'POST', body: JSON.stringify({ kind }) })

export const setAssetGrant = (
  id: string,
  aid: string,
  b: { team_id?: string; user_id?: string; level: string },
) =>
  apiFetch(`/orgs/${id}/assets/${aid}/grants`, OrgGrantSchema, {
    method: 'POST',
    body: JSON.stringify(b),
  })

export const getAssetMyAccess = (id: string, aid: string) =>
  apiFetch(`/orgs/${id}/assets/${aid}/my-access`, z.object({ level: AccessLevelSchema.nullable() }))

export const updateOrgSettings = (id: string, b: Record<string, unknown>) =>
  apiFetch(`/orgs/${id}/settings`, OrgSchema, { method: 'PATCH', body: JSON.stringify(b) })

export const presignOrgDoc = (id: string, filename: string) =>
  apiFetch(
    `/orgs/${id}/verification/presign`,
    z.object({ upload_url: z.string(), storage_key: z.string(), filename: z.string() }),
    { method: 'POST', body: JSON.stringify({ filename }) },
  )

export const submitVerification = (id: string, doc_keys: string[]) =>
  apiFetch(`/orgs/${id}/verification`, OkSchema, {
    method: 'POST',
    body: JSON.stringify({ doc_keys }),
  })

export const listOpportunities = (id: string) =>
  apiFetch(`/orgs/${id}/opportunities`, z.object({ items: z.array(OpportunitySchema) }))

export const createOpportunity = (
  id: string,
  b: { title: string; description: string; skills?: string[] },
) =>
  apiFetch(`/orgs/${id}/opportunities`, OpportunitySchema, {
    method: 'POST',
    body: JSON.stringify(b),
  })

export const listOrgApplications = (id: string) =>
  apiFetch(`/orgs/${id}/applications`, z.object({ items: z.array(OrgApplicationSchema) }))

export const listOrgAnnouncements = (id: string) =>
  apiFetch(`/orgs/${id}/announcements`, z.object({ items: z.array(OrgAnnouncementSchema) }))

export const createOrgAnnouncement = (
  id: string,
  b: { body_md: string; visibility: 'public' | 'private'; images?: string[] },
) =>
  apiFetch(`/orgs/${id}/announcements`, OrgAnnouncementSchema, {
    method: 'POST',
    body: JSON.stringify(b),
  })

export const updateOrgAnnouncement = (
  id: string,
  annId: string,
  b: { body_md?: string; visibility?: 'public' | 'private'; images?: string[] },
) =>
  apiFetch(`/orgs/${id}/announcements/${annId}`, OrgAnnouncementSchema, {
    method: 'PATCH',
    body: JSON.stringify(b),
  })

export const deleteOrgAnnouncement = (id: string, annId: string) =>
  apiDelete(`/orgs/${id}/announcements/${annId}`)

export const transferOrg = (id: string, uid: string) =>
  apiFetch(`/orgs/${id}/transfer`, OkSchema, {
    method: 'POST',
    body: JSON.stringify({ user_id: uid }),
  })

export const deleteOrg = (id: string) => apiDelete(`/orgs/${id}`)

export const adminListOrgs = (q: {
  q?: string
  type?: string
  verification?: string
  page?: number
} = {}) =>
  apiFetch<PaginatedAdminOrg>(`/admin/orgs${buildQuery(q)}`, PaginatedAdminOrgSchema)

export const adminVerifyQueue = () =>
  apiFetch('/admin/orgs/verification', z.object({ items: z.array(OrgVerificationQueueSchema) }))

export const adminApproveVerify = (id: string) =>
  apiFetch(`/admin/orgs/${id}/verification/approve`, OkSchema, { method: 'POST' })

export const adminRejectVerify = (id: string, note: string) =>
  apiFetch(`/admin/orgs/${id}/verification/reject`, OkSchema, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })

export const adminRevokeVerify = (id: string) =>
  apiFetch(`/admin/orgs/${id}/verification/revoke`, OkSchema, { method: 'POST' })

export const adminSuspendOrg = (id: string) =>
  apiFetch(`/admin/orgs/${id}/suspend`, AdminOrgSchema, { method: 'POST' })

export const adminRestoreOrg = (id: string) =>
  apiFetch(`/admin/orgs/${id}/restore`, AdminOrgSchema, { method: 'POST' })
