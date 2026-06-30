import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.categories.util import slugify
from app.modules.notifications.service import notify
from app.modules.teams.assets_policy import can_post, validate_message
from app.modules.teams.deps import get_team, membership, require_member, require_moderator, require_owner
from app.modules.teams.models import (
    Team,
    TeamChannel,
    TeamFile,
    TeamInvite,
    TeamJoinRequest,
    TeamMember,
    TeamMessage,
)
from app.modules.teams.roles import can_set_role, normalize_role, require as require_perm
from app.modules.teams.rls import next_team_rls_id
from app.modules.teams import service as team_svc
from app.modules.users.models import User

router = APIRouter(tags=["teams"])


async def _ser_member(db: AsyncSession, m: TeamMember) -> dict:
    u = (await db.execute(select(User).where(User.id == m.user_id))).scalar_one()
    return {
        "username": u.username,
        "name": u.name,
        "avatar_url": u.avatar_url,
        "role": normalize_role(m.role),
    }


@router.post("/teams", status_code=201)
async def create_team(
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base = slugify(body["name"])
    slug = base
    if (await db.execute(select(Team).where(Team.slug == slug))).scalar_one_or_none():
        slug = f"{base}-{uuid.uuid4().hex[:4]}"
    t = Team(
        slug=slug,
        name=body["name"].strip(),
        description=body.get("description", ""),
        visibility=body.get("visibility", "public"),
        created_by=user.id,
        rls_id=await next_team_rls_id(db),
    )
    db.add(t)
    await db.flush()
    db.add(TeamMember(team_id=t.id, user_id=user.id, role="owner"))
    db.add(TeamChannel(team_id=t.id, name="umum"))
    await db.commit()
    return {"slug": t.slug}


@router.get("/teams")
async def list_teams(
    q: str | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Team).where(Team.visibility == "public")
    if q:
        stmt = stmt.where(Team.name.ilike(f"%{q}%"))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (
        await db.execute(stmt.order_by(Team.created_at.desc()).offset(p.offset).limit(p.page_size))
    ).scalars().all()
    out = []
    for t in rows:
        n = (
            await db.execute(
                select(func.count()).select_from(TeamMember).where(TeamMember.team_id == t.id)
            )
        ).scalar_one()
        out.append(
            {
                "slug": t.slug,
                "name": t.name,
                "description": t.description,
                "avatar_url": t.avatar_url,
                "member_count": n,
            }
        )
    return paginated(out, total, p)


@router.get("/me/teams")
async def my_teams(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Team, TeamMember)
            .join(TeamMember, TeamMember.team_id == Team.id)
            .where(TeamMember.user_id == user.id)
        )
    ).all()
    return {
        "items": [
            {
                "id": t.id,
                "slug": t.slug,
                "name": t.name,
                "avatar_url": t.avatar_url,
                "role": normalize_role(m.role),
            }
            for t, m in rows
        ]
    }


@router.get("/teams/{slug}")
async def get_team_detail(
    slug: str,
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    mem = await membership(db, t.id, viewer.id) if viewer else None
    if t.visibility == "private" and not mem:
        raise ApiError(403, "private", "Tim privat")
    members = (
        await db.execute(select(TeamMember).where(TeamMember.team_id == t.id))
    ).scalars().all()
    return {
        "slug": t.slug,
        "name": t.name,
        "description": t.description,
        "avatar_url": t.avatar_url,
        "visibility": t.visibility,
        "my_role": normalize_role(mem.role) if mem else None,
        "members": [await _ser_member(db, m) for m in members],
    }


@router.patch("/teams/{slug}")
async def update_team(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    me = await require_moderator(db, t, user)
    require_perm(normalize_role(me.role), "moderate_members")
    for k in ("name", "description", "avatar_url", "visibility"):
        if k in body:
            setattr(t, k, body[k])
    await db.commit()
    return {"slug": t.slug}


@router.delete("/teams/{slug}", status_code=204)
async def delete_team(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    me = await require_owner(db, t, user)
    require_perm(normalize_role(me.role), "delete_team")
    await team_svc.delete_team_cascade(db, t)
    await db.commit()


@router.post("/teams/{slug}/leave")
async def leave_team_endpoint(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    return await team_svc.leave_team(db, t, user)


@router.post("/teams/{slug}/transfer")
async def transfer_owner(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    me = await require_owner(db, t, user)
    require_perm(normalize_role(me.role), "transfer_ownership")
    username = body.get("username") or body.get("user_id")
    if not username:
        raise ApiError(422, "bad_request", "username wajib")
    target = (
        await db.execute(select(User).where(User.username == username))
    ).scalar_one_or_none()
    if not target:
        target = (await db.execute(select(User).where(User.id == username))).scalar_one_or_none()
    if not target:
        raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    await team_svc.transfer_ownership(db, t.id, target.id, user.id)
    await db.commit()
    u = target
    return {"owner": {"username": u.username, "name": u.name}}


@router.patch("/teams/{slug}/members/{username}")
async def set_role(
    slug: str,
    username: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    me = await require_member(db, t, user)
    target_user = (
        await db.execute(select(User).where(User.username == username))
    ).scalar_one_or_none()
    tm = await membership(db, t.id, target_user.id) if target_user else None
    if not tm:
        raise ApiError(404, "not_found", "Bukan anggota")
    new_role = normalize_role(body.get("role"))
    if not new_role:
        raise ApiError(422, "bad_role", "Peran tidak valid")
    if not can_set_role(normalize_role(me.role), tm.role, new_role):
        raise ApiError(403, "forbidden", "Tidak boleh mengubah peran ini")
    if new_role == "owner":
        await team_svc.transfer_ownership(db, t.id, target_user.id, user.id)
    else:
        tm.role = new_role
    await db.commit()
    return {"role": normalize_role(tm.role)}


@router.delete("/teams/{slug}/members/{username}", status_code=204)
async def remove_member(
    slug: str,
    username: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    target = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    tm = await membership(db, t.id, target.id) if target else None
    if not tm:
        raise ApiError(404, "not_found", "Bukan anggota")
    if target.id == user.id:
        raise ApiError(400, "use_leave", "Gunakan POST /teams/{slug}/leave untuk keluar")
    me = await require_owner(db, t, user)
    require_perm(normalize_role(me.role), "kick")
    if normalize_role(tm.role) == "owner":
        raise ApiError(400, "owner", "Tidak bisa mengeluarkan owner")
    await db.delete(tm)
    await db.commit()


@router.post("/teams/{slug}/invites", status_code=201)
async def invite(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    me = await require_owner(db, t, user)
    require_perm(normalize_role(me.role), "invite")
    target = (
        await db.execute(select(User).where(User.username == body["username"]))
    ).scalar_one_or_none()
    if not target:
        raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    if await membership(db, t.id, target.id):
        raise ApiError(409, "member", "Sudah anggota")
    inv = TeamInvite(team_id=t.id, user_id=target.id, invited_by=user.id)
    db.add(inv)
    await db.commit()
    await notify(
        db,
        target.id,
        "team",
        f"Undangan tim: {t.name}",
        link="/me/teams",
        actor_id=user.id,
    )
    return {"id": inv.id}


@router.get("/me/team-invites")
async def my_invites(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(TeamInvite, Team)
            .join(Team, Team.id == TeamInvite.team_id)
            .where(TeamInvite.user_id == user.id, TeamInvite.status == "pending")
        )
    ).all()
    return {
        "items": [{"id": i.id, "team": {"slug": t.slug, "name": t.name}} for i, t in rows]
    }


@router.post("/me/team-invites/{iid}/accept")
async def accept_invite(
    iid: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    inv = (
        await db.execute(
            select(TeamInvite).where(TeamInvite.id == iid, TeamInvite.user_id == user.id)
        )
    ).scalar_one_or_none()
    if not inv or inv.status != "pending":
        raise ApiError(404, "not_found", "Undangan tidak valid")
    inv.status = "accepted"
    if not await membership(db, inv.team_id, user.id):
        db.add(TeamMember(team_id=inv.team_id, user_id=user.id, role="member"))
    await db.commit()
    return {"joined": True}


@router.post("/me/team-invites/{iid}/decline")
async def decline_invite(
    iid: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    inv = (
        await db.execute(
            select(TeamInvite).where(TeamInvite.id == iid, TeamInvite.user_id == user.id)
        )
    ).scalar_one_or_none()
    if inv:
        inv.status = "declined"
        await db.commit()
    return {"ok": True}


@router.post("/teams/{slug}/join-request", status_code=201)
async def join_request(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    if t.visibility != "public":
        raise ApiError(403, "private", "Tim privat — perlu undangan")
    if await membership(db, t.id, user.id):
        raise ApiError(409, "member", "Sudah anggota")
    jr = TeamJoinRequest(team_id=t.id, user_id=user.id)
    db.add(jr)
    await db.commit()
    owner = (
        await db.execute(
            select(TeamMember).where(TeamMember.team_id == t.id, TeamMember.role == "owner")
        )
    ).scalar_one_or_none()
    if owner:
        await notify(
            db,
            owner.user_id,
            "team",
            f"Permintaan bergabung: {t.name}",
            link=f"/teams/{t.slug}/requests",
            actor_id=user.id,
        )
    return {"id": jr.id}


@router.get("/teams/{slug}/join-requests")
async def list_requests(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    await require_moderator(db, t, user)
    rows = (
        await db.execute(
            select(TeamJoinRequest, User)
            .join(User, User.id == TeamJoinRequest.user_id)
            .where(TeamJoinRequest.team_id == t.id, TeamJoinRequest.status == "pending")
        )
    ).all()
    return {
        "items": [
            {
                "id": r.id,
                "user": {"username": u.username, "name": u.name, "avatar_url": u.avatar_url},
            }
            for r, u in rows
        ]
    }


@router.post("/teams/{slug}/join-requests/{rid}/{decision}")
async def decide_request(
    slug: str,
    rid: str,
    decision: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    await require_moderator(db, t, user)
    jr = (
        await db.execute(
            select(TeamJoinRequest).where(TeamJoinRequest.id == rid, TeamJoinRequest.team_id == t.id)
        )
    ).scalar_one_or_none()
    if not jr or jr.status != "pending":
        raise ApiError(404, "not_found", "Permintaan tidak valid")
    if decision == "approve":
        jr.status = "approved"
        if not await membership(db, t.id, jr.user_id):
            db.add(TeamMember(team_id=t.id, user_id=jr.user_id, role="member"))
        await notify(
            db,
            jr.user_id,
            "team",
            f"Diterima di tim {t.name}",
            link=f"/teams/{t.slug}",
        )
    else:
        jr.status = "rejected"
    await db.commit()
    return {"status": jr.status}


# --- Aset tim ---


@router.get("/teams/{slug}/assets")
async def list_assets(
    slug: str,
    kind: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    await require_member(db, t, user)
    items = await team_svc.list_team_assets(db, t.id, kind)
    return {"items": items}


@router.post("/teams/{slug}/assets", status_code=201)
async def create_asset(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    me = await require_member(db, t, user)
    require_perm(normalize_role(me.role), "manage_asset")
    return team_svc.create_asset_redirect(t.id, body["kind"])


# --- Diskusi & file ---


@router.get("/teams/{slug}/channels")
async def list_channels(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    await require_member(db, t, user)
    await team_svc.ensure_default_channel(db, t.id)
    await db.commit()
    rows = (
        await db.execute(select(TeamChannel).where(TeamChannel.team_id == t.id).order_by(TeamChannel.created_at))
    ).scalars().all()
    return {
        "items": [{"id": c.id, "name": c.name, "created_at": c.created_at.isoformat() if c.created_at else None} for c in rows]
    }


@router.post("/teams/{slug}/channels", status_code=201)
async def create_channel(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    me = await require_member(db, t, user)
    require_perm(normalize_role(me.role), "manage_discussion")
    name = (body.get("name") or "umum").strip()
    if not name:
        raise ApiError(422, "bad_name", "Nama channel wajib")
    ch = TeamChannel(team_id=t.id, name=name)
    db.add(ch)
    await db.commit()
    return {"id": ch.id, "name": ch.name}


@router.get("/teams/{slug}/channels/{cid}/messages")
async def list_messages(
    slug: str,
    cid: str,
    p: PageParams = Depends(page_params),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    await require_member(db, t, user)
    ch = (
        await db.execute(select(TeamChannel).where(TeamChannel.id == cid, TeamChannel.team_id == t.id))
    ).scalar_one_or_none()
    if not ch:
        raise ApiError(404, "not_found", "Channel tidak ditemukan")
    stmt = select(TeamMessage).where(TeamMessage.channel_id == cid)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (
        await db.execute(stmt.order_by(TeamMessage.created_at.asc()).offset(p.offset).limit(p.page_size))
    ).scalars().all()
    items = []
    for msg in rows:
        u = (await db.execute(select(User).where(User.id == msg.author_id))).scalar_one()
        files = (
            await db.execute(select(TeamFile).where(TeamFile.message_id == msg.id))
        ).scalars().all()
        items.append(
            {
                "id": msg.id,
                "body": msg.body,
                "author": {"username": u.username, "name": u.name, "avatar_url": u.avatar_url},
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
                "files": [await team_svc.serialize_file(db, f) for f in files],
            }
        )
    return paginated(items, total, p)


@router.post("/teams/{slug}/channels/{cid}/messages", status_code=201)
async def post_message(
    slug: str,
    cid: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    me = await require_member(db, t, user)
    if not can_post(normalize_role(me.role)):
        raise ApiError(403, "forbidden", "Tidak boleh mengirim pesan")
    ch = (
        await db.execute(select(TeamChannel).where(TeamChannel.id == cid, TeamChannel.team_id == t.id))
    ).scalar_one_or_none()
    if not ch:
        raise ApiError(404, "not_found", "Channel tidak ditemukan")
    file_ids = body.get("file_ids") or []
    attachments = [{"id": fid} for fid in file_ids] if file_ids else None
    validate_message(body.get("body"), attachments)
    msg = TeamMessage(channel_id=cid, author_id=user.id, body=body.get("body"))
    db.add(msg)
    await db.flush()
    if file_ids:
        for fid in file_ids:
            f = (
                await db.execute(
                    select(TeamFile).where(TeamFile.id == fid, TeamFile.team_id == t.id, TeamFile.message_id.is_(None))
                )
            ).scalar_one_or_none()
            if f:
                f.message_id = msg.id
                f.channel_id = cid
    await db.commit()
    u = user
    files = (
        await db.execute(select(TeamFile).where(TeamFile.message_id == msg.id))
    ).scalars().all()
    return {
        "id": msg.id,
        "body": msg.body,
        "author": {"username": u.username, "name": u.name, "avatar_url": u.avatar_url},
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
        "files": [await team_svc.serialize_file(db, f) for f in files],
    }


@router.post("/teams/{slug}/files/presign")
async def presign_file(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    me = await require_member(db, t, user)
    if not can_post(normalize_role(me.role)):
        raise ApiError(403, "forbidden", "Tidak boleh mengunggah file")
    filename = body.get("filename") or "file"
    return team_svc.presign_upload(t.id, filename)


@router.post("/teams/{slug}/files", status_code=201)
async def register_file(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    me = await require_member(db, t, user)
    if not can_post(normalize_role(me.role)):
        raise ApiError(403, "forbidden", "Tidak boleh mengunggah file")
    f = await team_svc.attach_file(
        db,
        t.id,
        user.id,
        {
            "filename": body["filename"],
            "size_bytes": body["size_bytes"],
            "storage_key": body["storage_key"],
            "channel_id": body.get("channel_id"),
        },
    )
    await db.commit()
    return await team_svc.serialize_file(db, f)


@router.get("/teams/{slug}/files")
async def list_files(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await get_team(db, slug)
    await require_member(db, t, user)
    rows = (
        await db.execute(select(TeamFile).where(TeamFile.team_id == t.id).order_by(TeamFile.created_at.desc()))
    ).scalars().all()
    return {"items": [await team_svc.serialize_file(db, f) for f in rows]}
