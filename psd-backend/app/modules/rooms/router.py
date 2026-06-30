import json
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, Response, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai.client import chat_json
from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.categories.service import filter_by_category_slugs, load_category_refs, resolve_category
from app.modules.categories.util import slugify
from app.core.storage import upload_asset, upload_public
from app.modules.gamification.service import award_badge, award_reputation
from app.modules.competitions.models import Competition
from app.modules.learn.models import Notebook
from app.modules.repos.models import Repo
from app.modules.rooms.deps import get_room, require_master
from app.modules.notifications.service import notify
from app.modules.rooms.models import IdeaRoom, ProblemComponent, RoomProblem, RoomSubmission
from app.tasks.dispatch import submit_room_data
from app.modules.synthesis.models import SynthesisJob
from app.modules.synthesis.quota import quota_for
from app.modules.teams.deps import membership
from app.modules.teams.models import Team, TeamMember
from app.modules.teams.rls import next_team_rls_id
from app.modules.users.models import User

router = APIRouter(tags=["idea-rooms"])
KINDS = {"context", "constraint", "goal", "data_need", "metric"}
IMG = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

DEFAULT_TEMPLATE = {
    "sections": [
        {"key": "eksplorasi", "title": "Eksplorasi Data"},
        {"key": "pemrosesan", "title": "Pemrosesan & Fitur"},
        {"key": "pemodelan", "title": "Pemodelan"},
        {"key": "evaluasi", "title": "Evaluasi & Hasil"},
    ]
}

FRAME_SYSTEM = (
    "Anda fasilitator problem-based learning untuk konteks Indonesia. Diberi komponen masalah dari tim "
    "(konteks/batasan/tujuan/kebutuhan data/metrik), ramu menjadi SATU JSON valid: "
    "{statement_md, suggested_metric, data_kind:'structured'|'unstructured', "
    "data_spec:{name,description,columns:[{name,dtype,params}]} (WAJIB bila structured), "
    "unstructured_guidance_md (WAJIB bila unstructured: panduan sumber/format/pelabelan)}. "
    "dtype yang diizinkan: int,float,category,bool,datetime,name,address,city,company,phone,id,text,formula."
)


def _ser_problem(p: RoomProblem) -> dict:
    return {
        "statement_md": p.statement_md,
        "suggested_metric": p.suggested_metric,
        "data_kind": p.data_kind,
        "data_spec": p.data_spec,
        "unstructured_guidance_md": p.unstructured_guidance_md,
        "generated_by": p.generated_by,
    }


async def _today_llm_used(db: AsyncSession, user_id: str) -> int:
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return (
        await db.execute(
            select(func.count())
            .select_from(SynthesisJob)
            .where(
                SynthesisJob.user_id == user_id,
                SynthesisJob.used_llm == True,  # noqa: E712
                SynthesisJob.created_at >= start,
            )
        )
    ).scalar_one()


async def _member_count(db: AsyncSession, team_id: str) -> int:
    return (
        await db.execute(
            select(func.count()).select_from(TeamMember).where(TeamMember.team_id == team_id)
        )
    ).scalar_one()


async def _summary(db: AsyncSession, r: IdeaRoom, members: int) -> dict:
    cat, sub = await load_category_refs(db, r.category_id, r.subcategory_id)
    return {
        "slug": r.slug,
        "title": r.title,
        "status": r.status,
        "member_count": members,
        "max_members": r.max_members,
        "framing_deadline": r.framing_deadline,
        "cover_url": r.cover_url,
        "category": cat,
        "subcategory": sub,
    }


@router.post("/idea-rooms/upload-cover")
async def upload_room_cover(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    ext = IMG.get(file.content_type or "")
    if not ext:
        raise ApiError(422, "invalid_file", "Format harus jpg, png, atau webp")
    data = await file.read()
    if len(data) > 4 * 1024 * 1024:
        raise ApiError(413, "too_large", "Ukuran maksimal 4 MB")
    key = f"rooms/covers/{user.id}/{uuid.uuid4().hex}.{ext}"
    try:
        url = upload_public(key, data, file.content_type or f"image/{ext}")
    except Exception as exc:
        raise ApiError(502, "storage_error", "Gagal mengunggah sampul") from exc
    return {"cover_url": url}


@router.post("/idea-rooms", status_code=201)
async def create_room(
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing_team_id = body.get("team_id")
    if existing_team_id:
        if not await membership(db, existing_team_id, user.id):
            raise ApiError(403, "forbidden", "Bukan anggota tim")
        team = (await db.execute(select(Team).where(Team.id == existing_team_id))).scalar_one_or_none()
        if not team:
            raise ApiError(404, "not_found", "Tim tidak ditemukan")
    else:
        base = slugify(body["title"])
        tslug = base
        if (await db.execute(select(Team).where(Team.slug == tslug))).scalar_one_or_none():
            tslug = f"{base}-{uuid.uuid4().hex[:4]}"
        team = Team(
            slug=tslug,
            name=body.get("team_name") or body["title"],
            visibility=body.get("visibility", "public"),
            created_by=user.id,
            rls_id=await next_team_rls_id(db),
        )
        db.add(team)
        await db.flush()
        db.add(TeamMember(team_id=team.id, user_id=user.id, role="owner"))
    base = slugify(body["title"])
    cat_id, sub_id = await resolve_category(db, body.get("category"), body.get("subcategory"))
    rslug = base
    if (await db.execute(select(IdeaRoom).where(IdeaRoom.slug == rslug))).scalar_one_or_none():
        rslug = f"{base}-{uuid.uuid4().hex[:4]}"
    room = IdeaRoom(
        slug=rslug,
        title=body["title"].strip(),
        pitch_md=body.get("pitch_md", ""),
        cover_url=body.get("cover_url"),
        founder_id=user.id,
        team_id=team.id,
        category_id=cat_id,
        subcategory_id=sub_id,
        status="draft",
        max_members=body.get("max_members"),
    )
    db.add(room)
    await db.commit()
    return {"slug": room.slug}


@router.get("/idea-rooms")
async def list_rooms(
    status: str | None = None,
    category: str | None = None,
    subcategory: str | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(IdeaRoom).join(Team, Team.id == IdeaRoom.team_id).where(Team.visibility == "public")
    if status:
        stmt = stmt.where(IdeaRoom.status == status)
    stmt = await filter_by_category_slugs(db, stmt, IdeaRoom, category, subcategory)
    stmt = stmt.order_by(IdeaRoom.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    out = [await _summary(db, r, await _member_count(db, r.team_id)) for r in rows]
    return paginated(out, total, p)


@router.get("/idea-rooms/{slug}")
async def get_room_detail(
    slug: str,
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    r = await get_room(db, slug)
    team = (await db.execute(select(Team).where(Team.id == r.team_id))).scalar_one()
    my = await membership(db, r.team_id, viewer.id) if viewer else None
    if team.visibility == "private" and not my:
        raise ApiError(403, "private", "Ruang privat")
    members = (
        await db.execute(
            select(TeamMember, User)
            .join(User, User.id == TeamMember.user_id)
            .where(TeamMember.team_id == r.team_id)
        )
    ).all()
    comp = (
        await db.execute(
            select(func.count()).select_from(ProblemComponent).where(ProblemComponent.room_id == r.id)
        )
    ).scalar_one()
    challenge = (
        await db.execute(select(Competition).where(Competition.room_id == r.id))
    ).scalar_one_or_none()
    return {
        **await _summary(db, r, len(members)),
        "pitch_md": r.pitch_md,
        "cover_url": r.cover_url,
        "team_slug": team.slug,
        "team_id": r.team_id,
        "my_role": my.role if my else None,
        "components_count": comp,
        "data_mode": r.data_mode,
        "dataset_repo_slug": r.dataset_repo_slug,
        "generation_error": r.generation_error,
        "competition_slug": challenge.slug if challenge else None,
        "members": [
            {"username": u.username, "name": u.name, "avatar_url": u.avatar_url, "role": m.role}
            for m, u in members
        ],
    }


@router.post("/idea-rooms/{slug}/publish")
async def publish(slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    r = await get_room(db, slug)
    await require_master(db, r, user)
    if r.status != "draft":
        raise ApiError(400, "invalid_state", "Hanya draft bisa diterbitkan")
    r.status = "open"
    await db.commit()
    return {"status": r.status}


@router.post("/idea-rooms/{slug}/start-framing")
async def start_framing(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await get_room(db, slug)
    await require_master(db, r, user)
    if r.status != "open":
        raise ApiError(400, "invalid_state", "Mulai framing hanya dari status open")
    hours = int(body.get("framing_hours", 72))
    r.status = "framing"
    r.framing_deadline = datetime.now(timezone.utc) + timedelta(hours=hours)
    await db.commit()
    return {"status": r.status, "framing_deadline": r.framing_deadline}


@router.post("/idea-rooms/{slug}/close")
async def close_room(slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    r = await get_room(db, slug)
    await require_master(db, r, user)
    if r.status not in ("open", "framing"):
        raise ApiError(400, "invalid_state", "Hanya open/framing bisa ditutup")
    r.status = "closed"
    await db.commit()
    return {"status": r.status}


@router.post("/idea-rooms/{slug}/join")
async def join_room(slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    r = await get_room(db, slug)
    if r.status not in ("open", "framing"):
        raise ApiError(400, "closed", "Pendaftaran ruang tertutup")
    team = (await db.execute(select(Team).where(Team.id == r.team_id))).scalar_one()
    if await membership(db, r.team_id, user.id):
        return {"joined": True}
    if team.visibility == "private":
        raise ApiError(403, "private", "Ruang privat — perlu undangan")
    if r.max_members and await _member_count(db, r.team_id) >= r.max_members:
        raise ApiError(409, "full", "Anggota sudah penuh")
    db.add(TeamMember(team_id=r.team_id, user_id=user.id, role="member"))
    await db.commit()
    await notify(
        db,
        r.founder_id,
        "room",
        f"Anggota baru di ruang: {r.title}",
        link=f"/idea-rooms/{r.slug}",
        actor_id=user.id,
    )
    return {"joined": True}


@router.post("/idea-rooms/{slug}/components", status_code=201)
async def add_component(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await get_room(db, slug)
    if r.status != "framing":
        raise ApiError(400, "invalid_state", "Bukan fase framing")
    if r.framing_deadline and datetime.now(timezone.utc) > r.framing_deadline:
        raise ApiError(400, "deadline", "Tenggang framing telah berakhir")
    if not await membership(db, r.team_id, user.id):
        raise ApiError(403, "forbidden", "Bukan anggota ruang")
    if body.get("kind") not in KINDS:
        raise ApiError(422, "bad_kind", "Jenis komponen tidak valid")
    c = ProblemComponent(
        room_id=r.id,
        author_id=user.id,
        kind=body["kind"],
        content_md=body["content_md"],
    )
    db.add(c)
    await db.commit()
    return {"id": c.id}


@router.get("/idea-rooms/{slug}/components")
async def list_components(slug: str, db: AsyncSession = Depends(get_db)):
    r = await get_room(db, slug)
    rows = (
        await db.execute(
            select(ProblemComponent, User)
            .join(User, User.id == ProblemComponent.author_id)
            .where(ProblemComponent.room_id == r.id)
            .order_by(ProblemComponent.created_at)
        )
    ).all()
    return {
        "items": [
            {
                "id": c.id,
                "kind": c.kind,
                "content_md": c.content_md,
                "author": {"username": u.username, "avatar_url": u.avatar_url},
            }
            for c, u in rows
        ]
    }


@router.delete("/idea-rooms/{slug}/components/{cid}", status_code=204)
async def delete_component(
    slug: str,
    cid: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await get_room(db, slug)
    c = (
        await db.execute(
            select(ProblemComponent).where(ProblemComponent.id == cid, ProblemComponent.room_id == r.id)
        )
    ).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Komponen tidak ditemukan")
    if c.author_id != user.id:
        await require_master(db, r, user)
    await db.delete(c)
    await db.commit()
    return Response(status_code=204)


@router.post("/idea-rooms/{slug}/frame-problem")
async def frame_problem(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await get_room(db, slug)
    await require_master(db, r, user)
    if r.status != "closed":
        raise ApiError(400, "invalid_state", "Ramu masalah hanya saat ruang closed")
    cfg = quota_for(user)
    if await _today_llm_used(db, user.id) >= cfg["plans_per_day"]:
        raise ApiError(429, "quota_exceeded", "Kuota AI harian habis. Naik tier untuk kuota lebih besar.")
    comps = (
        await db.execute(select(ProblemComponent).where(ProblemComponent.room_id == r.id))
    ).scalars().all()
    if not comps:
        raise ApiError(400, "no_components", "Belum ada komponen masalah")
    text = "Komponen masalah:\n" + "\n".join(f"- [{c.kind}] {c.content_md}" for c in comps)
    raw, usage = chat_json(FRAME_SYSTEM, text)
    data = json.loads(raw)
    prob = (
        await db.execute(select(RoomProblem).where(RoomProblem.room_id == r.id))
    ).scalar_one_or_none()
    if not prob:
        prob = RoomProblem(room_id=r.id)
        db.add(prob)
    prob.statement_md = data.get("statement_md", "")
    prob.suggested_metric = data.get("suggested_metric")
    prob.data_kind = data.get("data_kind", "structured")
    prob.data_spec = data.get("data_spec")
    prob.unstructured_guidance_md = data.get("unstructured_guidance_md")
    prob.generated_by = "ai"
    db.add(
        SynthesisJob(
            user_id=user.id,
            status="done",
            prompt=f"frame:{slug}",
            used_llm=True,
            n_rows=0,
            tokens_in=usage.prompt_tokens,
            tokens_out=usage.completion_tokens,
        )
    )
    await db.commit()
    return _ser_problem(prob)


@router.get("/idea-rooms/{slug}/problem")
async def get_problem(slug: str, db: AsyncSession = Depends(get_db)):
    r = await get_room(db, slug)
    p = (
        await db.execute(select(RoomProblem).where(RoomProblem.room_id == r.id))
    ).scalar_one_or_none()
    if not p:
        raise ApiError(404, "not_found", "Masalah belum diramu")
    return _ser_problem(p)


@router.patch("/idea-rooms/{slug}/problem")
async def edit_problem(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await get_room(db, slug)
    await require_master(db, r, user)
    p = (
        await db.execute(select(RoomProblem).where(RoomProblem.room_id == r.id))
    ).scalar_one_or_none()
    if not p:
        raise ApiError(404, "not_found", "Masalah belum diramu")
    for k in ("statement_md", "suggested_metric", "data_kind", "data_spec", "unstructured_guidance_md"):
        if k in body:
            setattr(p, k, body[k])
    p.generated_by = "manual"
    await db.commit()
    return _ser_problem(p)


@router.post("/idea-rooms/{slug}/generate-data")
async def generate_data(
    slug: str,
    body: dict,
    bg: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await get_room(db, slug)
    await require_master(db, r, user)
    if r.status != "closed":
        raise ApiError(400, "invalid_state", "Hasilkan data hanya saat closed")
    p = (
        await db.execute(select(RoomProblem).where(RoomProblem.room_id == r.id))
    ).scalar_one_or_none()
    if not p:
        raise ApiError(400, "no_problem", "Ramu masalah dulu")
    mode = body.get("data_mode")

    if p.data_kind == "unstructured" or mode == "collect":
        r.data_mode = "collect"
        r.status = "solving"
        await db.commit()
        return {"status": r.status, "data_mode": "collect"}

    if mode == "secondary":
        ds_slug = body.get("secondary_dataset_slug")
        ds = (
            await db.execute(select(Repo).where(Repo.slug == ds_slug, Repo.kind == "dataset"))
        ).scalar_one_or_none()
        if not ds:
            raise ApiError(404, "not_found", "Dataset sumber tidak ditemukan")
        r.data_mode = "secondary"
        r.dataset_repo_slug = ds_slug
        r.status = "solving"
        await db.commit()
        return {"status": r.status, "data_mode": "secondary"}

    if not p.data_spec:
        raise ApiError(400, "no_spec", "Tidak ada spesifikasi data untuk sintesis")
    n_rows = min(int(body.get("n_rows", 1000)), quota_for(user)["max_rows"])
    r.data_mode = "synthetic"
    r.status = "generating"
    r.generation_error = None
    await db.commit()
    extra = submit_room_data(r.id, n_rows, bg)
    return {"status": r.status, "data_mode": "synthetic", **extra}


@router.get("/idea-rooms/{slug}/solution-template")
async def get_template(slug: str, db: AsyncSession = Depends(get_db)):
    r = await get_room(db, slug)
    return r.solution_template or DEFAULT_TEMPLATE


@router.patch("/idea-rooms/{slug}/solution-template")
async def set_template(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await get_room(db, slug)
    await require_master(db, r, user)
    r.solution_template = body.get("template", DEFAULT_TEMPLATE)
    await db.commit()
    return r.solution_template


@router.post("/idea-rooms/{slug}/upload-data", status_code=201)
async def upload_room_data(
    slug: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await get_room(db, slug)
    if r.status != "solving" or r.data_mode != "collect":
        raise ApiError(400, "invalid_state", "Unggah data hanya untuk ruang collect saat solving")
    if not await membership(db, r.team_id, user.id):
        raise ApiError(403, "forbidden", "Bukan anggota ruang")
    data = await file.read()
    if len(data) > 100 * 1024 * 1024:
        raise ApiError(413, "too_large", "Maks 100 MB")
    team = (await db.execute(select(Team).where(Team.id == r.team_id))).scalar_one()
    fname = file.filename or "data"
    url = upload_asset(
        f"rooms/{slug}/{uuid.uuid4().hex}-{fname}",
        data,
        file.content_type or "application/octet-stream",
    )
    name = slugify(fname.rsplit(".", 1)[0]) or "data"
    ds_slug = f"{team.slug}/{name}"
    if (await db.execute(select(Repo).where(Repo.slug == ds_slug))).scalar_one_or_none():
        ds_slug = f"{ds_slug}-{uuid.uuid4().hex[:4]}"
    repo = Repo(
        kind="dataset",
        owner_id=r.founder_id,
        team_id=r.team_id,
        name=name,
        slug=ds_slug,
        description="Data dikumpulkan tim (ruang ide).",
        visibility="private",
        room_id=r.id,
        files=[
            {
                "path": fname,
                "url": url,
                "size_bytes": len(data),
                "type": file.content_type or "application/octet-stream",
            }
        ],
    )
    db.add(repo)
    await db.commit()
    r.dataset_repo_slug = ds_slug
    await db.commit()
    return {"dataset_slug": ds_slug}


@router.post("/idea-rooms/{slug}/submit", status_code=201)
async def submit_solution(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await get_room(db, slug)
    await require_master(db, r, user)
    if r.status != "solving":
        raise ApiError(400, "invalid_state", "Submit hanya saat solving")
    sub = (
        await db.execute(select(RoomSubmission).where(RoomSubmission.room_id == r.id))
    ).scalar_one_or_none()
    if not sub:
        sub = RoomSubmission(room_id=r.id, submitted_by=user.id)
        db.add(sub)
    sub.notebook_id = body.get("notebook_id")
    sub.result_summary_md = body.get("result_summary_md", "")
    sub.asset_refs = body.get("asset_refs", [])
    sub.metrics = body.get("metrics", {})
    r.status = "submitted"
    await db.commit()
    return {"id": sub.id, "status": r.status}


@router.get("/idea-rooms/{slug}/submission")
async def get_submission(slug: str, db: AsyncSession = Depends(get_db)):
    r = await get_room(db, slug)
    s = (
        await db.execute(select(RoomSubmission).where(RoomSubmission.room_id == r.id))
    ).scalar_one_or_none()
    if not s:
        raise ApiError(404, "not_found", "Belum ada submission")
    return {
        "result_summary_md": s.result_summary_md,
        "notebook_id": s.notebook_id,
        "asset_refs": s.asset_refs,
        "metrics": s.metrics,
        "submitted_by": s.submitted_by,
    }


@router.post("/idea-rooms/{slug}/finish")
async def finish_room(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await get_room(db, slug)
    await require_master(db, r, user)
    if r.status != "submitted":
        raise ApiError(400, "invalid_state", "Finish hanya saat submitted")
    sub = (
        await db.execute(select(RoomSubmission).where(RoomSubmission.room_id == r.id))
    ).scalar_one_or_none()

    if body.get("publish_assets") and sub:
        vis = body.get("visibility", "public")
        for ref in sub.asset_refs:
            if ref.get("type") in ("dataset", "model", "project"):
                repo = (
                    await db.execute(select(Repo).where(Repo.slug == ref["slug"]))
                ).scalar_one_or_none()
                if repo:
                    repo.visibility = vis
                    if repo.room_id is None:
                        repo.room_id = r.id

    r.status = "finished"
    await db.commit()

    members = (
        await db.execute(select(TeamMember).where(TeamMember.team_id == r.team_id))
    ).scalars().all()
    for m in members:
        u = (await db.execute(select(User).where(User.id == m.user_id))).scalar_one()
        await award_reputation(db, u, "room_finished", points=30)
        await award_badge(db, u.id, "pemecah_masalah")
        if m.user_id != user.id:
            await notify(
                db,
                m.user_id,
                "room",
                f"Ruang selesai: {r.title}",
                link=f"/idea-rooms/{r.slug}",
            )
    await award_badge(db, user.id, "arsitek_ide")
    return {"status": r.status}


@router.get("/idea-rooms/by-id/{room_id}")
async def room_by_id(room_id: str, db: AsyncSession = Depends(get_db)):
    r = (await db.execute(select(IdeaRoom).where(IdeaRoom.id == room_id))).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Ruang tidak ditemukan")
    return {"slug": r.slug, "title": r.title}


@router.post("/idea-rooms/{slug}/challenge", status_code=201)
async def challenge(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await get_room(db, slug)
    await require_master(db, r, user)
    if r.status != "finished":
        raise ApiError(400, "invalid_state", "Tantangan hanya dari ruang finished")
    prob = (
        await db.execute(select(RoomProblem).where(RoomProblem.room_id == r.id))
    ).scalar_one_or_none()
    metric = body.get("metric") or (prob.suggested_metric if prob else "RMSE")
    days = int(body.get("duration_days", 14))
    now = datetime.now(timezone.utc)
    cslug = slugify(body.get("title") or f"tantangan-{r.slug}")
    if (await db.execute(select(Competition).where(Competition.slug == cslug))).scalar_one_or_none():
        cslug = f"{cslug}-{uuid.uuid4().hex[:4]}"
    c = Competition(
        slug=cslug,
        title=body.get("title") or f"Tantangan: {r.title}",
        sponsor=body.get("sponsor"),
        status="active",
        metric=metric,
        starts_at=now,
        ends_at=now + timedelta(days=days),
        overview_md=(prob.statement_md if prob else r.pitch_md),
        rules_md=body.get("rules_md", "Diturunkan dari Ruang Ide."),
        dataset_info_md=f"Dataset ruang: {r.dataset_repo_slug or '-'}",
        category_id=r.category_id,
        subcategory_id=r.subcategory_id,
        tags=body.get("tags", []),
        room_id=r.id,
    )
    db.add(c)
    r.status = "challenged"
    await db.commit()
    return {"competition_slug": c.slug, "status": r.status}


@router.post("/idea-rooms/{slug}/publish-assets")
async def publish_assets(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await get_room(db, slug)
    await require_master(db, r, user)
    if r.status not in ("finished", "challenged"):
        raise ApiError(400, "invalid_state", "Publikasi hanya dari ruang finished/challenged")
    vis = body.get("visibility", "public")
    published = []
    for ref in body.get("assets", []):
        t = ref.get("type")
        if t in ("dataset", "model", "project"):
            repo = (
                await db.execute(select(Repo).where(Repo.slug == ref["slug"]))
            ).scalar_one_or_none()
            if repo and repo.team_id == r.team_id:
                repo.visibility = vis
                if repo.room_id is None:
                    repo.room_id = r.id
                published.append(ref)
        elif t == "notebook":
            nb = (
                await db.execute(select(Notebook).where(Notebook.id == ref["id"]))
            ).scalar_one_or_none()
            if nb and nb.team_id == r.team_id:
                if nb.room_id is None:
                    nb.room_id = r.id
                published.append(ref)
    await db.commit()
    return {"published": published}


@router.get("/idea-rooms/{slug}/assets")
async def room_assets(slug: str, db: AsyncSession = Depends(get_db)):
    r = await get_room(db, slug)
    repos = (
        await db.execute(select(Repo).where(Repo.room_id == r.id))
    ).scalars().all()
    return {
        "items": [
            {
                "type": x.kind,
                "slug": x.slug,
                "name": x.name,
                "visibility": x.visibility,
                "synthetic": getattr(x, "synthetic", False),
            }
            for x in repos
        ]
    }
