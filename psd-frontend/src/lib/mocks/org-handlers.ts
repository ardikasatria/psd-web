import { isStaff } from '@/lib/auth/roles'
import { orgCan, canSetOrgRole } from '@/lib/orgs/permissions'
import { canPostOpportunity } from '@/lib/orgs/org-utils'
import {
  adminOrgOf,
  assetAccessForUser,
  canChangeRole,
  canRemoveMember,
  createMockOrg,
  findOrg,
  mockOpportunities,
  mockOrgApplications,
  mockOrgAssets,
  mockOrgGrants,
  mockOrgMembers,
  mockOrgTeamMembers,
  mockOrgTeams,
  mockOrgVerifications,
  mockOrgs,
  myOrgsOf,
  nextGrantId,
  orgDetailOf,
  orgMembersOf,
  userOrgMembership,
  verificationQueueItems,
} from '@/lib/mocks/data/orgs'
import { users, demoUser } from '@/lib/mocks/data/users'
import { http, HttpResponse } from 'msw'

type MockUser = (typeof users)[number] | typeof demoUser

type HandlerCtx = {
  API: string
  resolveUserFromRequest: (request: Request) => MockUser | null
  errorResponse: (status: number, code: string, message: string) => HttpResponse<Record<string, unknown>>
  paginate: <T>(items: T[], page?: number, page_size?: number) => {
    items: T[]
    total: number
    page: number
    page_size: number
  }
}

export function createOrgHandlers(ctx: HandlerCtx) {
  const { API, resolveUserFromRequest, errorResponse, paginate } = ctx

  return [
    http.get(`${API}/orgs`, ({ request }) => {
      const url = new URL(request.url)
      const q = url.searchParams.get('q')?.toLowerCase()
      const type = url.searchParams.get('type')
      const page = Number(url.searchParams.get('page') ?? 1)
      let items = mockOrgs
        .filter((o) => !o.suspended)
        .map((o) => ({
          id: o.id,
          handle: o.handle,
          name: o.name,
          type: o.type,
          verification: o.verification,
          description: (o.description ?? '').slice(0, 200),
        }))
      if (q) {
        items = items.filter(
          (o) => o.name.toLowerCase().includes(q) || o.handle.includes(q),
        )
      }
      if (type) items = items.filter((o) => o.type === type)
      return HttpResponse.json(paginate(items, page))
    }),

    http.get(`${API}/orgs/opportunities/featured`, () => {
      const items = mockOpportunities
        .filter((op) => op.status === 'open')
        .map((op) => {
          const org = findOrg(op.org_id)
          return {
            id: op.id,
            title: op.title,
            org_handle: org?.handle ?? '',
            org_name: org?.name ?? 'Organisasi',
            skills: op.skills,
            created_at: op.created_at,
          }
        })
        .filter((op) => op.org_handle)
      return HttpResponse.json({ items })
    }),

    http.post(`${API}/orgs`, async ({ request }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const body = (await request.json()) as { handle: string; name: string; type: string }
      const result = createMockOrg(user.id, body)
      if (result.error) return errorResponse(result.error.status, result.error.code, result.error.message)
      return HttpResponse.json(result.data, { status: 201 })
    }),

    http.get(`${API}/orgs/me`, ({ request }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      return HttpResponse.json({ items: myOrgsOf(user.id) })
    }),

    http.get(`${API}/orgs/:handle`, ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      const o = findOrg(String(params.handle))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      if (o.suspended && !isStaff(user ?? undefined)) {
        return errorResponse(403, 'suspended', 'Organisasi ditangguhkan')
      }
      return HttpResponse.json(orgDetailOf(o, user?.id))
    }),

    http.post(`${API}/orgs/:id/leave`, ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      if (!canRemoveMember(o.id, user.id)) {
        return errorResponse(403, 'last_owner', 'Tidak bisa keluar sebagai owner terakhir')
      }
      const idx = mockOrgMembers.findIndex((m) => m.org_id === o.id && m.user_id === user.id)
      if (idx >= 0) mockOrgMembers.splice(idx, 1)
      return HttpResponse.json({ ok: true })
    }),

    http.post(`${API}/orgs/:id/members/invite`, async ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const me = userOrgMembership(o.id, user.id)
      if (!me || !orgCan(me.role, 'manage_members')) {
        return errorResponse(403, 'forbidden', 'Butuh izin kelola anggota')
      }
      const body = (await request.json()) as { username: string }
      const target = users.find((u) => u.username === body.username)
      if (!target) return errorResponse(404, 'not_found', 'Pengguna tidak ditemukan')
      if (userOrgMembership(o.id, target.id)) {
        return errorResponse(409, 'member', 'Sudah anggota')
      }
      mockOrgMembers.push({ org_id: o.id, user_id: target.id, role: 'member' })
      return HttpResponse.json({ ok: true }, { status: 201 })
    }),

    http.post(`${API}/orgs/:id/members/:uid/role`, async ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const me = userOrgMembership(o.id, user.id)
      const target = mockOrgMembers.find((m) => m.org_id === o.id && m.user_id === params.uid)
      if (!target) return errorResponse(404, 'not_found', 'Bukan anggota')
      const body = (await request.json()) as { role: string }
      if (!canSetOrgRole(me?.role, target.role, body.role)) {
        return errorResponse(403, 'forbidden', 'Tidak boleh mengubah peran ini')
      }
      if (!canChangeRole(o.id, String(params.uid), body.role)) {
        return errorResponse(403, 'last_owner', 'Tidak bisa mendemovasi owner terakhir')
      }
      target.role = body.role as typeof target.role
      return HttpResponse.json({ role: target.role })
    }),

    http.delete(`${API}/orgs/:id/members/:uid`, ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const me = userOrgMembership(o.id, user.id)
      if (!me || !orgCan(me.role, 'manage_members')) {
        return errorResponse(403, 'forbidden', 'Butuh izin kelola anggota')
      }
      if (!canRemoveMember(o.id, String(params.uid))) {
        return errorResponse(403, 'last_owner', 'Tidak bisa menghapus owner terakhir')
      }
      const idx = mockOrgMembers.findIndex((m) => m.org_id === o.id && m.user_id === params.uid)
      if (idx < 0) return errorResponse(404, 'not_found', 'Bukan anggota')
      mockOrgMembers.splice(idx, 1)
      return new HttpResponse(null, { status: 204 })
    }),

    http.post(`${API}/orgs/:id/teams`, async ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const me = userOrgMembership(o.id, user.id)
      if (!me || !orgCan(me.role, 'manage_teams')) {
        return errorResponse(403, 'forbidden', 'Butuh izin kelola tim')
      }
      const body = (await request.json()) as { name: string }
      const id = `ot_${Date.now()}`
      mockOrgTeams.push({ id, org_id: o.id, name: body.name.trim() })
      return HttpResponse.json({ id, name: body.name.trim() }, { status: 201 })
    }),

    http.post(`${API}/orgs/:id/teams/:tid/members`, async ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const me = userOrgMembership(o.id, user.id)
      if (!me || !orgCan(me.role, 'manage_teams')) {
        return errorResponse(403, 'forbidden', 'Butuh izin kelola tim')
      }
      const body = (await request.json()) as { user_id: string }
      if (!userOrgMembership(o.id, body.user_id)) {
        return errorResponse(400, 'not_member', 'Pengguna harus anggota org dulu')
      }
      if (mockOrgTeamMembers.some((tm) => tm.team_id === params.tid && tm.user_id === body.user_id)) {
        return errorResponse(409, 'exists', 'Sudah di tim')
      }
      mockOrgTeamMembers.push({ team_id: String(params.tid), user_id: body.user_id })
      return HttpResponse.json({ ok: true })
    }),

    http.get(`${API}/orgs/:id/assets`, ({ request, params }) => {
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const user = resolveUserFromRequest(request)
      const items = mockOrgAssets
        .filter((a) => a.org_id === o.id)
        .map((a) => ({
          ...a,
          my_access: user ? assetAccessForUser(o.id, a.id, user.id) : null,
        }))
      return HttpResponse.json({ items })
    }),

    http.post(`${API}/orgs/:id/assets`, async ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const me = userOrgMembership(o.id, user.id)
      if (!me || !orgCan(me.role, 'manage_assets')) {
        return errorResponse(403, 'forbidden', 'Butuh izin kelola aset')
      }
      const body = (await request.json()) as { kind: string }
      const id = `oa_${Date.now()}`
      const asset = {
        id,
        org_id: o.id,
        kind: body.kind,
        title: `Aset ${body.kind} baru`,
        path: `/${body.kind}s/org-${o.handle}`,
      }
      mockOrgAssets.push(asset)
      return HttpResponse.json(
        { id, kind: asset.kind, title: asset.title, path: asset.path, my_access: 'admin' },
        { status: 201 },
      )
    }),

    http.post(`${API}/orgs/:id/assets/:aid/grants`, async ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const me = userOrgMembership(o.id, user.id)
      if (!me || !orgCan(me.role, 'manage_assets')) {
        return errorResponse(403, 'forbidden', 'Butuh izin kelola aset')
      }
      const body = (await request.json()) as { team_id?: string; user_id?: string; level: string }
      const grant = {
        id: nextGrantId(),
        org_id: o.id,
        asset_id: String(params.aid),
        team_id: body.team_id ?? null,
        user_id: body.user_id ?? null,
        level: body.level,
      }
      mockOrgGrants.push(grant)
      return HttpResponse.json(grant, { status: 201 })
    }),

    http.get(`${API}/orgs/:id/assets/:aid/my-access`, ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const level = assetAccessForUser(o.id, String(params.aid), user.id)
      return HttpResponse.json({ level })
    }),

    http.patch(`${API}/orgs/:id/settings`, async ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const me = userOrgMembership(o.id, user.id)
      if (!me || !orgCan(me.role, 'manage_settings')) {
        return errorResponse(403, 'forbidden', 'Butuh izin kelola pengaturan')
      }
      const body = (await request.json()) as Record<string, unknown>
      if (body.name !== undefined) o.name = String(body.name)
      if (body.description !== undefined) o.description = String(body.description)
      if (body.base_permission !== undefined) {
        o.base_permission = body.base_permission ? String(body.base_permission) : null
      }
      return HttpResponse.json({
        id: o.id,
        handle: o.handle,
        name: o.name,
        type: o.type,
        verification: o.verification,
        my_role: me.role,
      })
    }),

    http.post(`${API}/orgs/:id/verification/presign`, async ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const me = userOrgMembership(o.id, user.id)
      if (!me || !orgCan(me.role, 'manage_verification')) {
        return errorResponse(403, 'forbidden', 'Butuh izin verifikasi')
      }
      const body = (await request.json()) as { filename: string }
      const storage_key = `kyc/${o.handle}/${body.filename}`
      return HttpResponse.json({
        upload_url: `https://mock-minio.local/upload/${encodeURIComponent(storage_key)}`,
        storage_key,
        filename: body.filename,
      })
    }),

    http.post(`${API}/orgs/:id/verification`, async ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const me = userOrgMembership(o.id, user.id)
      if (!me || !orgCan(me.role, 'manage_verification')) {
        return errorResponse(403, 'forbidden', 'Butuh izin verifikasi')
      }
      const body = (await request.json()) as { doc_keys: string[] }
      if (!['unverified', 'rejected'].includes(o.verification)) {
        return errorResponse(409, 'invalid_transition', 'Tidak bisa ajukan dari status ini')
      }
      o.verification = 'pending'
      const id = `vr_${Date.now()}`
      mockOrgVerifications.push({
        id,
        org_id: o.id,
        status: 'pending',
        doc_keys: body.doc_keys,
        note: null,
        submitted_at: new Date().toISOString(),
      })
      return HttpResponse.json({ ok: true })
    }),

    http.get(`${API}/orgs/:id/opportunities`, ({ params }) => {
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const items = mockOpportunities.filter((op) => op.org_id === o.id)
      return HttpResponse.json({ items })
    }),

    http.post(`${API}/orgs/:id/opportunities`, async ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const me = userOrgMembership(o.id, user.id)
      if (!me || !orgCan(me.role, 'post_opportunity')) {
        return errorResponse(403, 'forbidden', 'Butuh izin posting peluang')
      }
      if (!canPostOpportunity(o.type, o.verification)) {
        return errorResponse(403, 'not_verified', 'Org harus terverifikasi untuk memasang peluang')
      }
      const body = (await request.json()) as { title: string; description: string; skills?: string[] }
      const op = {
        id: `op_${Date.now()}`,
        org_id: o.id,
        title: body.title,
        description: body.description,
        skills: body.skills ?? [],
        status: 'open' as const,
        created_at: new Date().toISOString(),
      }
      mockOpportunities.push(op)
      return HttpResponse.json(op, { status: 201 })
    }),

    http.get(`${API}/orgs/:id/applications`, ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const me = userOrgMembership(o.id, user.id)
      if (!me || !orgCan(me.role, 'manage_recruitment')) {
        return errorResponse(403, 'forbidden', 'Butuh izin rekrutmen')
      }
      const items = mockOrgApplications
        .filter((a) => a.org_id === o.id)
        .map((a) => {
          const u = users.find((x) => x.id === a.applicant_id)!
          const op = mockOpportunities.find((x) => x.id === a.opportunity_id)
          return {
            id: a.id,
            opportunity_id: a.opportunity_id,
            opportunity_title: op?.title,
            applicant: { user_id: a.applicant_id, username: u.username, name: u.name },
            status: a.status,
            created_at: a.created_at,
          }
        })
      return HttpResponse.json({ items })
    }),

    http.post(`${API}/orgs/:id/transfer`, async ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const me = userOrgMembership(o.id, user.id)
      if (!me || !orgCan(me.role, 'transfer_ownership')) {
        return errorResponse(403, 'forbidden', 'Hanya owner')
      }
      const body = (await request.json()) as { user_id: string }
      const target = userOrgMembership(o.id, body.user_id)
      if (!target) return errorResponse(404, 'not_found', 'Target bukan anggota')
      me.role = 'admin'
      target.role = 'owner'
      return HttpResponse.json({ ok: true })
    }),

    http.delete(`${API}/orgs/:id`, ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user) return errorResponse(401, 'unauthorized', 'Masuk dulu')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const me = userOrgMembership(o.id, user.id)
      if (!me || !orgCan(me.role, 'delete_org')) {
        return errorResponse(403, 'forbidden', 'Hanya owner')
      }
      const idx = mockOrgs.findIndex((x) => x.id === o.id)
      if (idx >= 0) mockOrgs.splice(idx, 1)
      for (let i = mockOrgMembers.length - 1; i >= 0; i--) {
        if (mockOrgMembers[i].org_id === o.id) mockOrgMembers.splice(i, 1)
      }
      return new HttpResponse(null, { status: 204 })
    }),

    http.get(`${API}/admin/orgs`, ({ request }) => {
      const user = resolveUserFromRequest(request)
      if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
      const url = new URL(request.url)
      const q = url.searchParams.get('q')?.toLowerCase()
      const type = url.searchParams.get('type')
      const verification = url.searchParams.get('verification')
      const page = Number(url.searchParams.get('page') ?? 1)
      let items = mockOrgs.map(adminOrgOf)
      if (q) {
        items = items.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            o.handle.includes(q) ||
            o.owner_username.includes(q),
        )
      }
      if (type) items = items.filter((o) => o.type === type)
      if (verification) items = items.filter((o) => o.verification === verification)
      return HttpResponse.json(paginate(items, page))
    }),

    http.get(`${API}/admin/orgs/verification`, ({ request }) => {
      const user = resolveUserFromRequest(request)
      if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
      return HttpResponse.json({ items: verificationQueueItems() })
    }),

    http.post(`${API}/admin/orgs/:id/verification/approve`, ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      if (o.verification !== 'pending') {
        return errorResponse(409, 'invalid_transition', 'Hanya bisa setujui yang pending')
      }
      o.verification = 'verified'
      const vr = mockOrgVerifications.find((v) => v.org_id === o.id && v.status === 'pending')
      if (vr) vr.status = 'approved'
      return HttpResponse.json({ ok: true })
    }),

    http.post(`${API}/admin/orgs/:id/verification/reject`, async ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      const body = (await request.json()) as { note?: string }
      if (o.verification !== 'pending') {
        return errorResponse(409, 'invalid_transition', 'Hanya bisa tolak yang pending')
      }
      o.verification = 'rejected'
      const vr = mockOrgVerifications.find((v) => v.org_id === o.id && v.status === 'pending')
      if (vr) {
        vr.status = 'rejected'
        vr.note = body.note ?? null
      }
      return HttpResponse.json({ ok: true })
    }),

    http.post(`${API}/admin/orgs/:id/verification/revoke`, ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      if (o.verification !== 'verified') {
        return errorResponse(409, 'invalid_transition', 'Hanya bisa cabut yang verified')
      }
      o.verification = 'unverified'
      return HttpResponse.json({ ok: true })
    }),

    http.post(`${API}/admin/orgs/:id/suspend`, ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      o.suspended = true
      return HttpResponse.json(adminOrgOf(o))
    }),

    http.post(`${API}/admin/orgs/:id/restore`, ({ request, params }) => {
      const user = resolveUserFromRequest(request)
      if (!user || !isStaff(user)) return errorResponse(403, 'forbidden', 'Akses khusus admin')
      const o = findOrg(String(params.id))
      if (!o) return errorResponse(404, 'not_found', 'Organisasi tidak ditemukan')
      o.suspended = false
      return HttpResponse.json(adminOrgOf(o))
    }),
  ]
}
