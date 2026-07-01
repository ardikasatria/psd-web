import json

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional, require_staff
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.orgs import access as access_mod
from app.modules.orgs import membership as membership_mod
from app.modules.orgs import service as org_svc
from app.modules.orgs.deps import (
    get_org_by_handle,
    get_org_by_id,
    membership,
    members_dicts,
    require_member,
    require_platform_admin,
)
from app.modules.orgs.models import (
    Opportunity,
    OpportunityApplication,
    OrgAsset,
    OrgAssetGrant,
    OrgMember,
    OrgTeam,
    OrgTeamMember,
    OrgVerificationRequest,
    Organization,
)
from app.modules.orgs.org_types import apply_verification, can_post_opportunity, validate_org_type
from app.modules.orgs.roles import can_set_role, require as require_perm
from app.modules.users.models import User

router = APIRouter(tags=["orgs"])


@router.get("/orgs")
async def list_orgs(
    q: str | None = None,
    type: str | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    """Daftar organisasi publik (non-suspended)."""
    stmt = select(Organization).where(Organization.suspended.is_(False))
    if q:
        stmt = stmt.where(
            or_(Organization.name.ilike(f"%{q}%"), Organization.handle.ilike(f"%{q}%"))
        )
    if type:
        stmt = stmt.where(Organization.type == type)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (
        await db.execute(stmt.order_by(Organization.created_at.desc()).offset(p.offset).limit(p.page_size))
    ).scalars().all()
    items = [
        {
            "id": o.id,
            "handle": o.handle,
            "name": o.name,
            "type": o.type,
            "verification": o.verification,
            "description": (o.description or "")[:200],
        }
        for o in rows
    ]
    return paginated(items, total, p)


@router.post("/orgs", status_code=201)
async def create_org(
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    handle = membership_mod.validate_handle(body["handle"])
    org_type = validate_org_type(body.get("type", "community"))
    owned = (
        await db.execute(
            select(func.count())
            .select_from(OrgMember)
            .where(OrgMember.user_id == user.id, OrgMember.role == "owner")
        )
    ).scalar_one()
    if not membership_mod.can_create_org(owned, cap=None):
        raise ApiError(403, "org_cap", "Batas pembuatan organisasi tercapai")
    if (await db.execute(select(Organization).where(Organization.handle == handle))).scalar_one_or_none():
        raise ApiError(409, "duplicate_handle", "Handle sudah dipakai")
    org = Organization(
        handle=handle,
        name=body["name"].strip(),
        type=org_type,
        base_permission="read",
        created_by=user.id,
    )
    db.add(org)
    await db.flush()
    db.add(OrgMember(org_id=org.id, user_id=user.id, role="owner"))
    await db.commit()
    return {"id": org.id, "handle": org.handle}


@router.get("/orgs/me")
async def my_orgs(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Organization, OrgMember)
            .join(OrgMember, OrgMember.org_id == Organization.id)
            .where(OrgMember.user_id == user.id)
        )
    ).all()
    return {
        "items": [
            {
                "id": o.id,
                "handle": o.handle,
                "name": o.name,
                "type": o.type,
                "verification": o.verification,
                "role": m.role,
            }
            for o, m in rows
        ]
    }


@router.get("/orgs/{handle}")
async def get_org(
    handle: str,
    user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_handle(db, handle)
    if org.suspended and (not user or not user.role in ("superadmin", "moderator")):
        raise ApiError(403, "suspended", "Organisasi ditangguhkan")
    return await org_svc.serialize_org_detail(db, org, user.id if user else None)


@router.post("/orgs/{org_id}/leave")
async def leave_org(
    org_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    mems = await members_dicts(db, org.id)
    if not membership_mod.can_remove_member(mems, user.id):
        raise ApiError(403, "last_owner", "Tidak bisa keluar sebagai owner terakhir")
    m = await membership(db, org.id, user.id)
    if not m:
        raise ApiError(404, "not_found", "Bukan anggota")
    await db.delete(m)
    await db.commit()
    return {"ok": True}


@router.post("/orgs/{org_id}/members/invite", status_code=201)
async def invite_member(
    org_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    me = await require_member(db, org, user)
    require_perm(me.role, "manage_members")
    target = (
        await db.execute(select(User).where(User.username == body["username"]))
    ).scalar_one_or_none()
    if not target:
        raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    if await membership(db, org.id, target.id):
        raise ApiError(409, "member", "Sudah anggota")
    db.add(OrgMember(org_id=org.id, user_id=target.id, role="member"))
    await db.commit()
    return {"ok": True}


@router.post("/orgs/{org_id}/members/{uid}/role")
async def set_role(
    org_id: str,
    uid: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    me = await require_member(db, org, user)
    mems = await members_dicts(db, org.id)
    target = await membership(db, org.id, uid)
    if not target:
        raise ApiError(404, "not_found", "Bukan anggota")
    new_role = body["role"]
    if not can_set_role(me.role, target.role, new_role):
        raise ApiError(403, "forbidden", "Tidak boleh mengubah peran ini")
    if not membership_mod.can_change_role(mems, uid, new_role):
        raise ApiError(403, "last_owner", "Tidak bisa mendemovasi owner terakhir")
    target.role = new_role
    await db.commit()
    return {"role": target.role}


@router.delete("/orgs/{org_id}/members/{uid}", status_code=204)
async def remove_member(
    org_id: str,
    uid: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    me = await require_member(db, org, user)
    require_perm(me.role, "manage_members")
    mems = await members_dicts(db, org.id)
    if not membership_mod.can_remove_member(mems, uid):
        raise ApiError(403, "last_owner", "Tidak bisa menghapus owner terakhir")
    target = await membership(db, org.id, uid)
    if not target:
        raise ApiError(404, "not_found", "Bukan anggota")
    await db.delete(target)
    await db.commit()


@router.post("/orgs/{org_id}/teams", status_code=201)
async def create_team(
    org_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    me = await require_member(db, org, user)
    require_perm(me.role, "manage_teams")
    t = OrgTeam(org_id=org.id, name=body["name"].strip())
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return {"id": t.id, "name": t.name}


@router.post("/orgs/{org_id}/teams/{team_id}/members")
async def add_team_member(
    org_id: str,
    team_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    me = await require_member(db, org, user)
    require_perm(me.role, "manage_teams")
    if not await membership(db, org.id, body["user_id"]):
        raise ApiError(400, "not_member", "Pengguna harus anggota org dulu")
    existing = (
        await db.execute(
            select(OrgTeamMember).where(
                OrgTeamMember.team_id == team_id, OrgTeamMember.user_id == body["user_id"]
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise ApiError(409, "exists", "Sudah di tim")
    db.add(OrgTeamMember(team_id=team_id, user_id=body["user_id"]))
    await db.commit()
    return {"ok": True}


@router.get("/orgs/{org_id}/assets")
async def list_assets(
    org_id: str,
    user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    assets = (await db.execute(select(OrgAsset).where(OrgAsset.org_id == org.id))).scalars().all()
    items = []
    for a in assets:
        items.append(
            {
                "id": a.id,
                "kind": a.kind,
                "title": a.title,
                "path": a.path,
                "my_access": await org_svc.resolve_my_access(
                    db, org, user.id if user else None, a.id
                ),
            }
        )
    return {"items": items}


@router.post("/orgs/{org_id}/assets", status_code=201)
async def create_asset(
    org_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    me = await require_member(db, org, user)
    require_perm(me.role, "manage_assets")
    kind = body.get("kind", "project")
    a = OrgAsset(
        org_id=org.id,
        kind=kind,
        title=f"Aset {kind} baru",
        path=f"/{kind}s/org-{org.handle}",
    )
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return {
        "id": a.id,
        "kind": a.kind,
        "title": a.title,
        "path": a.path,
        "my_access": "admin",
    }


@router.post("/orgs/{org_id}/assets/{asset_id}/grants", status_code=201)
async def set_grant(
    org_id: str,
    asset_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    me = await require_member(db, org, user)
    require_perm(me.role, "manage_assets")
    level = body["level"]
    if not access_mod.is_valid_level(level):
        raise ApiError(422, "bad_level", "Level akses tidak valid")
    g = OrgAssetGrant(
        org_id=org.id,
        asset_id=asset_id,
        team_id=body.get("team_id"),
        user_id=body.get("user_id"),
        level=level,
    )
    db.add(g)
    await db.commit()
    await db.refresh(g)
    return {"id": g.id, "team_id": g.team_id, "user_id": g.user_id, "level": g.level}


@router.get("/orgs/{org_id}/assets/{asset_id}/my-access")
async def my_access(
    org_id: str,
    asset_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    level = await org_svc.resolve_my_access(db, org, user.id, asset_id)
    return {"level": level}


@router.patch("/orgs/{org_id}/settings")
async def update_settings(
    org_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    me = await require_member(db, org, user)
    require_perm(me.role, "manage_settings")
    if body.get("name") is not None:
        org.name = str(body["name"]).strip()
    if body.get("description") is not None:
        org.description = str(body["description"])
    if "base_permission" in body:
        bp = body["base_permission"]
        org.base_permission = bp if bp else None
    await db.commit()
    return {
        "id": org.id,
        "handle": org.handle,
        "name": org.name,
        "type": org.type,
        "verification": org.verification,
        "my_role": me.role,
    }


@router.post("/orgs/{org_id}/verification/presign")
async def presign_verification(
    org_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    me = await require_member(db, org, user)
    require_perm(me.role, "manage_verification")
    return org_svc.kyc_presign(org.handle, body["filename"])


@router.post("/orgs/{org_id}/verification")
async def submit_verification(
    org_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    me = await require_member(db, org, user)
    require_perm(me.role, "manage_verification")
    org.verification = apply_verification(org.verification, "submit")
    vr = OrgVerificationRequest(
        org_id=org.id,
        status="pending",
        doc_keys=json.dumps(body.get("doc_keys", [])),
    )
    db.add(vr)
    await db.commit()
    return {"ok": True}


@router.get("/orgs/{org_id}/opportunities")
async def list_opportunities(org_id: str, db: AsyncSession = Depends(get_db)):
    org = await get_org_by_id(db, org_id)
    rows = (await db.execute(select(Opportunity).where(Opportunity.org_id == org.id))).scalars().all()
    return {
        "items": [
            {
                "id": o.id,
                "title": o.title,
                "description": o.description,
                "skills": json.loads(o.skills or "[]"),
                "status": o.status,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in rows
        ]
    }


@router.post("/orgs/{org_id}/opportunities", status_code=201)
async def create_opportunity(
    org_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    me = await require_member(db, org, user)
    require_perm(me.role, "post_opportunity")
    if not can_post_opportunity(org.type, org.verification):
        raise ApiError(403, "not_verified", "Org harus terverifikasi untuk memasang peluang")
    op = Opportunity(
        org_id=org.id,
        title=body["title"].strip(),
        description=body.get("description", ""),
        skills=json.dumps(body.get("skills", [])),
    )
    db.add(op)
    await db.commit()
    await db.refresh(op)
    return {
        "id": op.id,
        "title": op.title,
        "description": op.description,
        "skills": json.loads(op.skills or "[]"),
        "status": op.status,
        "created_at": op.created_at.isoformat() if op.created_at else None,
    }


@router.get("/orgs/{org_id}/applications")
async def list_applications(
    org_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    me = await require_member(db, org, user)
    require_perm(me.role, "manage_recruitment")
    rows = (
        await db.execute(
            select(OpportunityApplication).where(OpportunityApplication.org_id == org.id)
        )
    ).scalars().all()
    items = []
    for a in rows:
        u = (await db.execute(select(User).where(User.id == a.applicant_id))).scalar_one()
        op = (
            await db.execute(select(Opportunity).where(Opportunity.id == a.opportunity_id))
        ).scalar_one_or_none()
        items.append(
            {
                "id": a.id,
                "opportunity_id": a.opportunity_id,
                "opportunity_title": op.title if op else None,
                "applicant": {"user_id": a.applicant_id, "username": u.username, "name": u.name},
                "status": a.status,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
        )
    return {"items": items}


@router.post("/orgs/{org_id}/transfer")
async def transfer_ownership(
    org_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    me = await require_member(db, org, user)
    require_perm(me.role, "transfer_ownership")
    target = await membership(db, org.id, body["user_id"])
    if not target:
        raise ApiError(404, "not_found", "Target bukan anggota")
    me.role = "admin"
    target.role = "owner"
    await db.commit()
    return {"ok": True}


@router.delete("/orgs/{org_id}", status_code=204)
async def delete_org(
    org_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    me = await require_member(db, org, user)
    require_perm(me.role, "delete_org")
    for m in (await db.execute(select(OrgMember).where(OrgMember.org_id == org.id))).scalars().all():
        await db.delete(m)
    await db.delete(org)
    await db.commit()


# --- Admin platform ---

@router.get("/admin/orgs", dependencies=[Depends(require_staff)])
async def admin_list_orgs(
    q: str | None = None,
    type: str | None = None,
    verification: str | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Organization)
    if q:
        stmt = stmt.where(
            or_(Organization.name.ilike(f"%{q}%"), Organization.handle.ilike(f"%{q}%"))
        )
    if type:
        stmt = stmt.where(Organization.type == type)
    if verification:
        stmt = stmt.where(Organization.verification == verification)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (
        await db.execute(stmt.order_by(Organization.created_at.desc()).offset(p.offset).limit(p.page_size))
    ).scalars().all()
    items = [await org_svc.admin_org_row(db, o) for o in rows]
    return paginated(items, total, p)


@router.get("/admin/orgs/verification", dependencies=[Depends(require_staff)])
async def admin_verification_queue(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(OrgVerificationRequest, Organization)
            .join(Organization, Organization.id == OrgVerificationRequest.org_id)
            .where(OrgVerificationRequest.status == "pending")
        )
    ).all()
    items = []
    for vr, org in rows:
        keys = json.loads(vr.doc_keys or "[]")
        items.append(
            {
                "id": vr.id,
                "org_id": org.id,
                "org_handle": org.handle,
                "org_name": org.name,
                "org_type": org.type,
                "status": vr.status,
                "doc_keys": keys,
                "doc_urls": org_svc.kyc_doc_urls(keys),
                "submitted_at": vr.submitted_at.isoformat() if vr.submitted_at else None,
            }
        )
    return {"items": items}


@router.post("/admin/orgs/{org_id}/verification/approve", dependencies=[Depends(require_staff)])
async def admin_approve(
    org_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    org.verification = apply_verification(org.verification, "approve")
    vr = (
        await db.execute(
            select(OrgVerificationRequest).where(
                OrgVerificationRequest.org_id == org.id, OrgVerificationRequest.status == "pending"
            )
        )
    ).scalars().first()
    if vr:
        vr.status = "approved"
        vr.reviewed_by = user.id
    await db.commit()
    return {"ok": True}


@router.post("/admin/orgs/{org_id}/verification/reject", dependencies=[Depends(require_staff)])
async def admin_reject(
    org_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_id(db, org_id)
    org.verification = apply_verification(org.verification, "reject")
    vr = (
        await db.execute(
            select(OrgVerificationRequest).where(
                OrgVerificationRequest.org_id == org.id, OrgVerificationRequest.status == "pending"
            )
        )
    ).scalars().first()
    if vr:
        vr.status = "rejected"
        vr.note = body.get("note")
        vr.reviewed_by = user.id
    await db.commit()
    return {"ok": True}


@router.post("/admin/orgs/{org_id}/verification/revoke", dependencies=[Depends(require_staff)])
async def admin_revoke(org_id: str, db: AsyncSession = Depends(get_db)):
    org = await get_org_by_id(db, org_id)
    org.verification = apply_verification(org.verification, "revoke")
    await db.commit()
    return {"ok": True}


@router.post("/admin/orgs/{org_id}/suspend", dependencies=[Depends(require_staff)])
async def admin_suspend(org_id: str, db: AsyncSession = Depends(get_db)):
    org = await get_org_by_id(db, org_id)
    org.suspended = True
    await db.commit()
    return await org_svc.admin_org_row(db, org)


@router.post("/admin/orgs/{org_id}/restore", dependencies=[Depends(require_staff)])
async def admin_restore(org_id: str, db: AsyncSession = Depends(get_db)):
    org = await get_org_by_id(db, org_id)
    org.suspended = False
    await db.commit()
    return await org_svc.admin_org_row(db, org)
