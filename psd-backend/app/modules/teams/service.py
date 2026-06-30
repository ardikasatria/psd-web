"""Layanan tim: aktivitas anggota, suksesi, aset, diskusi."""
from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.storage import presigned_asset_get
from app.modules.competitions.models import Submission
from app.modules.factory.models import DataSource, Pipeline
from app.modules.learn.models import Notebook
from app.modules.repos.models import Repo
from app.modules.rooms.models import IdeaRoom
from app.modules.synthesis.models import SynthesisJob
from app.modules.teams.assets_policy import validate_asset_kind
from app.modules.teams.models import (
    Team,
    TeamChannel,
    TeamFile,
    TeamMember,
    TeamMessage,
)
from app.modules.teams.roles import CO_OWNER, OWNER, normalize_role
from app.modules.teams.succession import pick_successor
from app.modules.users.models import User

ASSET_CREATE_PATHS: dict[str, str] = {
    "project": "/projects/new",
    "dataset": "/datasets/new",
    "model": "/models/new",
    "notebook": "/notebooks/new",
    "idea_space": "/idea-rooms",
    "data_factory": "/factory/sources",
    "transformer_space": "/factory/pipelines",
    "model_registry": "/ml",
    "synthetic_data": "/synthesis",
    "analytics_space": "/analytics",
    "competition": "/competitions",
}


async def member_role(db: AsyncSession, team_id: str, user_id: str) -> str | None:
    m = (
        await db.execute(
            select(TeamMember.role).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        )
    ).scalar_one_or_none()
    return normalize_role(m)


async def require_member(db: AsyncSession, team: Team, user: User) -> TeamMember:
    m = (
        await db.execute(
            select(TeamMember).where(TeamMember.team_id == team.id, TeamMember.user_id == user.id)
        )
    ).scalar_one_or_none()
    if not m:
        raise ApiError(403, "forbidden", "Bukan anggota tim")
    return m


async def list_members_with_activity(db: AsyncSession, team_id: str) -> list[dict]:
    members = (
        await db.execute(select(TeamMember).where(TeamMember.team_id == team_id))
    ).scalars().all()
    channel_ids = (
        await db.execute(select(TeamChannel.id).where(TeamChannel.team_id == team_id))
    ).scalars().all()
    out: list[dict] = []
    for m in members:
        commits = (
            await db.execute(
                select(func.count()).select_from(Repo).where(Repo.team_id == team_id, Repo.owner_id == m.user_id)
            )
        ).scalar_one()
        submissions = (
            await db.execute(
                select(func.count())
                .select_from(Submission)
                .where(Submission.team_id == team_id, Submission.user_id == m.user_id)
            )
        ).scalar_one()
        contributions = (
            await db.execute(
                select(func.count())
                .select_from(Repo)
                .where(Repo.team_id == team_id, Repo.owner_id == m.user_id)
            )
        ).scalar_one() + (
            await db.execute(
                select(func.count())
                .select_from(Notebook)
                .where(Notebook.team_id == team_id, Notebook.owner_id == m.user_id)
            )
        ).scalar_one()
        messages = 0
        if channel_ids:
            messages = (
                await db.execute(
                    select(func.count())
                    .select_from(TeamMessage)
                    .where(TeamMessage.channel_id.in_(channel_ids), TeamMessage.author_id == m.user_id)
                )
            ).scalar_one()
        out.append(
            {
                "user_id": m.user_id,
                "role": normalize_role(m.role),
                "joined_at": m.joined_at.isoformat() if m.joined_at else "",
                "commits": commits,
                "submissions": submissions,
                "contributions": contributions,
                "messages": messages,
            }
        )
    return out


async def transfer_ownership(
    db: AsyncSession, team_id: str, new_owner_id: str, old_owner_id: str | None
) -> None:
    new_m = (
        await db.execute(
            select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == new_owner_id)
        )
    ).scalar_one_or_none()
    if not new_m:
        raise ApiError(404, "not_found", "Bukan anggota")
    new_m.role = OWNER
    if old_owner_id and old_owner_id != new_owner_id:
        old_m = (
            await db.execute(
                select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == old_owner_id)
            )
        ).scalar_one_or_none()
        if old_m:
            old_m.role = CO_OWNER


async def delete_team_cascade(db: AsyncSession, team: Team) -> None:
    from app.modules.teams.models import TeamInvite, TeamJoinRequest

    channel_ids = (
        await db.execute(select(TeamChannel.id).where(TeamChannel.team_id == team.id))
    ).scalars().all()
    await db.execute(TeamFile.__table__.delete().where(TeamFile.team_id == team.id))
    if channel_ids:
        await db.execute(TeamMessage.__table__.delete().where(TeamMessage.channel_id.in_(channel_ids)))
    await db.execute(TeamChannel.__table__.delete().where(TeamChannel.team_id == team.id))
    for tbl in (TeamMember, TeamInvite, TeamJoinRequest):
        await db.execute(tbl.__table__.delete().where(tbl.team_id == team.id))
    await db.delete(team)


async def leave_team(db: AsyncSession, team: Team, user: User) -> dict:
    m = await require_member(db, team, user)
    role = normalize_role(m.role)
    if role == OWNER:
        members = await list_members_with_activity(db, team.id)
        successor = pick_successor(members, leaving_user_id=user.id)
        if successor is None:
            await delete_team_cascade(db, team)
            await db.commit()
            return {"left": True, "team_deleted": True}
        await transfer_ownership(db, team.id, successor["user_id"], user.id)
        await db.delete(m)
        await db.commit()
        u = (await db.execute(select(User).where(User.id == successor["user_id"]))).scalar_one()
        return {"left": True, "successor": {"username": u.username, "name": u.name}}
    await db.delete(m)
    await db.commit()
    return {"left": True}


async def ensure_default_channel(db: AsyncSession, team_id: str) -> TeamChannel:
    ch = (
        await db.execute(select(TeamChannel).where(TeamChannel.team_id == team_id).limit(1))
    ).scalar_one_or_none()
    if ch:
        return ch
    ch = TeamChannel(team_id=team_id, name="umum")
    db.add(ch)
    await db.flush()
    return ch


async def list_team_assets(db: AsyncSession, team_id: str, kind: str | None = None) -> list[dict]:
    items: list[dict] = []

    def add(kind_name: str, ref_id: str, title: str, path: str):
        if kind and kind_name != kind:
            return
        items.append({"kind": kind_name, "ref_id": ref_id, "title": title, "path": path})

    repos = (await db.execute(select(Repo).where(Repo.team_id == team_id))).scalars().all()
    for r in repos:
        add(r.kind, r.id, r.name, f"/{r.kind}s/{r.slug}")

    notebooks = (await db.execute(select(Notebook).where(Notebook.team_id == team_id))).scalars().all()
    for n in notebooks:
        add("notebook", n.id, n.title, f"/notebooks/{n.id}")

    rooms = (await db.execute(select(IdeaRoom).where(IdeaRoom.team_id == team_id))).scalars().all()
    for room in rooms:
        add("idea_space", room.id, room.title, f"/rooms/{room.slug}")

    sources = (await db.execute(select(DataSource).where(DataSource.team_id == team_id))).scalars().all()
    for s in sources:
        add("data_factory", s.id, s.name, f"/factory/sources/{s.id}")

    pipelines = (await db.execute(select(Pipeline).where(Pipeline.team_id == team_id))).scalars().all()
    for p in pipelines:
        add("transformer_space", p.id, p.title, f"/factory/pipelines/{p.slug}")

    synth = (await db.execute(select(SynthesisJob).where(SynthesisJob.team_id == team_id))).scalars().all()
    for j in synth:
        title = (j.prompt or j.id)[:80] if j.prompt else j.id
        add("synthetic_data", j.id, title, f"/synthesis/{j.id}")

    return items


def create_asset_redirect(team_id: str, kind: str) -> dict:
    validate_asset_kind(kind)
    path = ASSET_CREATE_PATHS.get(kind)
    if not path:
        raise ApiError(422, "bad_asset_kind", f"Belum ada alur buat untuk jenis: {kind}")
    direct_new = kind in ("project", "dataset", "model", "notebook", "competition")
    if direct_new:
        return {"kind": kind, "create_url": f"{path}?team_id={team_id}"}
    return {"kind": kind, "create_url": f"{path}?team_id={team_id}&create=1"}


def presign_upload(team_id: str, filename: str) -> dict:
    from app.core.storage import presigned_asset_put

    key = f"teams/{team_id}/files/{uuid.uuid4().hex}_{filename}"
    return {"upload_url": presigned_asset_put(key), "storage_key": key, "filename": filename}


async def attach_file(db: AsyncSession, team_id: str, uploader_id: str, file_meta: dict) -> TeamFile:
    from app.modules.teams.assets_policy import validate_attachment

    validate_attachment(file_meta["filename"], file_meta["size_bytes"])
    f = TeamFile(
        team_id=team_id,
        channel_id=file_meta.get("channel_id"),
        message_id=file_meta.get("message_id"),
        uploader_id=uploader_id,
        filename=file_meta["filename"],
        size_bytes=file_meta["size_bytes"],
        storage_key=file_meta["storage_key"],
    )
    db.add(f)
    await db.flush()
    return f


async def serialize_file(db: AsyncSession, f: TeamFile) -> dict:
    u = (await db.execute(select(User).where(User.id == f.uploader_id))).scalar_one()
    return {
        "id": f.id,
        "filename": f.filename,
        "size_bytes": f.size_bytes,
        "channel_id": f.channel_id,
        "message_id": f.message_id,
        "uploader": {"username": u.username, "name": u.name},
        "created_at": f.created_at.isoformat() if f.created_at else None,
        "download_url": presigned_asset_get(f.storage_key),
    }
