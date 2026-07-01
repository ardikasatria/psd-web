import json
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import presigned_get, presigned_private_put
from app.modules.orgs import access as access_mod
from app.modules.orgs.deps import membership, members_dicts
from app.modules.orgs.models import (
    Opportunity,
    OpportunityApplication,
    OrgAnnouncement,
    OrgAsset,
    OrgAssetGrant,
    OrgMember,
    OrgTeam,
    OrgTeamMember,
    OrgVerificationRequest,
    Organization,
)
from app.modules.orgs.org_types import apply_verification
from app.modules.users.models import User


async def serialize_member(db: AsyncSession, m: OrgMember) -> dict:
    u = (await db.execute(select(User).where(User.id == m.user_id))).scalar_one()
    return {
        "user_id": m.user_id,
        "username": u.username,
        "name": u.name,
        "avatar_url": u.avatar_url,
        "role": m.role,
        "joined_at": m.joined_at.isoformat() if m.joined_at else None,
    }


async def team_levels_for(db: AsyncSession, org_id: str, user_id: str, asset_id: str) -> list[str]:
    team_ids = (
        await db.execute(
            select(OrgTeamMember.team_id).where(OrgTeamMember.user_id == user_id)
        )
    ).scalars().all()
    if not team_ids:
        return []
    grants = (
        await db.execute(
            select(OrgAssetGrant).where(
                OrgAssetGrant.org_id == org_id,
                OrgAssetGrant.asset_id == asset_id,
                OrgAssetGrant.team_id.in_(team_ids),
            )
        )
    ).scalars().all()
    return [g.level for g in grants]


async def resolve_my_access(
    db: AsyncSession, org: Organization, user_id: str | None, asset_id: str
) -> str | None:
    if not user_id:
        return None
    mem = await membership(db, org.id, user_id)
    direct = (
        await db.execute(
            select(OrgAssetGrant).where(
                OrgAssetGrant.org_id == org.id,
                OrgAssetGrant.asset_id == asset_id,
                OrgAssetGrant.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    teams = await team_levels_for(db, org.id, user_id, asset_id)
    return access_mod.resolve_asset_level(
        role=mem.role if mem else None,
        org_base=org.base_permission,
        team_levels=teams,
        direct_level=direct.level if direct else None,
    )


async def serialize_announcement(db: AsyncSession, ann: OrgAnnouncement) -> dict:
    u = (await db.execute(select(User).where(User.id == ann.author_id))).scalar_one()
    return {
        "id": ann.id,
        "body_md": ann.body_md,
        "images": json.loads(ann.images or "[]"),
        "visibility": ann.visibility,
        "author": {
            "user_id": ann.author_id,
            "username": u.username,
            "name": u.name,
            "avatar_url": u.avatar_url,
        },
        "created_at": ann.created_at.isoformat() if ann.created_at else None,
        "updated_at": ann.updated_at.isoformat() if ann.updated_at else None,
    }


def filter_announcements_for_viewer(items: list[dict], is_member: bool) -> list[dict]:
    if is_member:
        return items
    return [a for a in items if a.get("visibility") == "public"]


async def serialize_org_detail(db: AsyncSession, org: Organization, viewer_id: str | None) -> dict:
    mem_rows = (await db.execute(select(OrgMember).where(OrgMember.org_id == org.id))).scalars().all()
    mem = next((m for m in mem_rows if m.user_id == viewer_id), None) if viewer_id else None
    members = [await serialize_member(db, m) for m in mem_rows]

    teams_raw = (await db.execute(select(OrgTeam).where(OrgTeam.org_id == org.id))).scalars().all()
    teams = []
    for t in teams_raw:
        tm = (
            await db.execute(select(OrgTeamMember).where(OrgTeamMember.team_id == t.id))
        ).scalars().all()
        team_members = []
        for x in tm:
            u = (await db.execute(select(User).where(User.id == x.user_id))).scalar_one()
            team_members.append({"user_id": x.user_id, "username": u.username, "name": u.name})
        teams.append(
            {"id": t.id, "name": t.name, "member_count": len(tm), "members": team_members}
        )

    assets_raw = (await db.execute(select(OrgAsset).where(OrgAsset.org_id == org.id))).scalars().all()
    assets = []
    for a in assets_raw:
        assets.append(
            {
                "id": a.id,
                "kind": a.kind,
                "title": a.title,
                "path": a.path,
                "my_access": await resolve_my_access(db, org, viewer_id, a.id),
            }
        )

    opps = (
        await db.execute(select(Opportunity).where(Opportunity.org_id == org.id))
    ).scalars().all()
    opportunities = [
        {
            "id": o.id,
            "title": o.title,
            "description": o.description,
            "skills": json.loads(o.skills or "[]"),
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in opps
    ]

    anns_raw = (
        await db.execute(
            select(OrgAnnouncement)
            .where(OrgAnnouncement.org_id == org.id)
            .order_by(OrgAnnouncement.created_at.desc())
        )
    ).scalars().all()
    announcements_all = [await serialize_announcement(db, a) for a in anns_raw]
    announcements = filter_announcements_for_viewer(announcements_all, mem is not None)

    vr = (
        await db.execute(
            select(OrgVerificationRequest)
            .where(OrgVerificationRequest.org_id == org.id, OrgVerificationRequest.status == "pending")
            .order_by(OrgVerificationRequest.submitted_at.desc())
        )
    ).scalar_one_or_none()

    return {
        "id": org.id,
        "handle": org.handle,
        "name": org.name,
        "type": org.type,
        "verification": org.verification,
        "description": org.description,
        "base_permission": org.base_permission,
        "suspended": org.suspended,
        "my_role": mem.role if mem else None,
        "members": members,
        "teams": teams,
        "assets": assets,
        "opportunities": opportunities,
        "announcements": announcements,
        "verification_request": (
            {
                "id": vr.id,
                "status": vr.status,
                "doc_keys": json.loads(vr.doc_keys or "[]"),
                "note": vr.note,
            }
            if vr
            else None
        ),
    }


async def admin_org_row(db: AsyncSession, org: Organization) -> dict:
    n = (
        await db.execute(
            select(func.count()).select_from(OrgMember).where(OrgMember.org_id == org.id)
        )
    ).scalar_one()
    owner = (
        await db.execute(
            select(OrgMember).where(OrgMember.org_id == org.id, OrgMember.role == "owner")
        )
    ).scalars().first()
    owner_u = None
    if owner:
        owner_u = (await db.execute(select(User).where(User.id == owner.user_id))).scalar_one()
    return {
        "id": org.id,
        "handle": org.handle,
        "name": org.name,
        "type": org.type,
        "verification": org.verification,
        "member_count": n,
        "owner_username": owner_u.username if owner_u else "—",
        "suspended": org.suspended,
        "created_at": org.created_at.isoformat() if org.created_at else None,
    }


def kyc_presign(org_handle: str, filename: str) -> dict:
    key = f"kyc/{org_handle}/{uuid.uuid4().hex[:8]}_{filename}"
    return {
        "upload_url": presigned_private_put(key),
        "storage_key": key,
        "filename": filename,
    }


def kyc_doc_urls(doc_keys: list[str]) -> list[dict]:
    return [{"key": k, "url": presigned_get(k)} for k in doc_keys]
