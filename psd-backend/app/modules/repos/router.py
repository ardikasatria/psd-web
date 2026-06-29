import uuid

from fastapi import APIRouter, Depends, File, Response, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.core.search import client, delete_repo_doc, index_repo
from app.core.storage import delete_asset, upload_asset
from app.modules.categories.service import apply_category_body, filter_by_category_slugs, load_category_refs
from app.modules.engagement import service as engagement_service
from app.modules.gamification.tiers import perks_for
from app.modules.repos.models import Repo, RepoLike
from app.modules.repos.schemas import RepoUpdate, to_detail, to_summary
from app.modules.rooms.models import IdeaRoom
from app.modules.teams.deps import membership, team_ref
from app.modules.teams.models import Team
from app.modules.users.models import User
from app.modules.users.refs import is_staff
from app.gitea.service import (
    client_or_none,
    flip_source,
    list_repo_files,
    maybe_provision,
    mirror_upload,
    repo_diff,
)

router = APIRouter(tags=["registry"])
KIND_MAP = {"projects": "project", "datasets": "dataset", "models": "model"}


async def _get_repo(db: AsyncSession, repo_id: str) -> Repo:
    r = (await db.execute(select(Repo).where(Repo.id == repo_id))).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Aset tidak ditemukan")
    return r


def _meili_sort(sort: str | None) -> list[str]:
    if not sort:
        return []
    field = sort.lstrip("-")
    direction = "desc" if sort.startswith("-") else "asc"
    return [f"{field}:{direction}"]


async def _resolve_team_id(db: AsyncSession, team_id: str | None, user: User) -> str | None:
    if not team_id:
        return None
    t = (await db.execute(select(Team).where(Team.id == team_id))).scalar_one_or_none()
    if not t:
        raise ApiError(404, "not_found", "Tim tidak ditemukan")
    if not await membership(db, t.id, user.id):
        raise ApiError(403, "forbidden", "Bukan anggota tim")
    return t.id


async def _team_filter(db: AsyncSession, stmt, team: str | None):
    if not team:
        return stmt
    t = (await db.execute(select(Team).where(Team.slug == team))).scalar_one_or_none()
    if not t:
        return stmt.where(Repo.id == "__none__")
    return stmt.where(Repo.team_id == t.id)


async def _from_room_ref(db: AsyncSession, room_id: str | None) -> dict | None:
    if not room_id:
        return None
    r = (await db.execute(select(IdeaRoom).where(IdeaRoom.id == room_id))).scalar_one_or_none()
    if not r:
        return None
    return {"slug": r.slug, "title": r.title}


async def _repo_summary(db: AsyncSession, r: Repo) -> dict:
    cat, sub = await load_category_refs(db, r.category_id, r.subcategory_id)
    tm = await team_ref(db, r.team_id)
    return to_summary(r, cat, sub, tm)


async def _list(db, kind, q, tags, sort, category, subcategory, team, p: PageParams):
    if q or tags:
        filters = [f'kind = "{kind}"']
        if tags:
            filters += [f'tags = "{t}"' for t in tags.split(",") if t.strip()]
        try:
            res = client.index("repos").search(
                q or "",
                {
                    "filter": " AND ".join(filters),
                    "sort": _meili_sort(sort),
                    "offset": p.offset,
                    "limit": p.page_size,
                },
            )
            ids = [h["id"] for h in res["hits"]]
            if ids:
                rows = (await db.execute(select(Repo).where(Repo.id.in_(ids)))).scalars().all()
                order = {rid: i for i, rid in enumerate(ids)}
                rows.sort(key=lambda r: order.get(r.id, len(ids)))
            else:
                rows = []
            items = []
            for r in rows:
                if team and r.team_id:
                    tm = await team_ref(db, r.team_id)
                    if not tm or tm["slug"] != team:
                        continue
                items.append(await _repo_summary(db, r))
            return paginated(items, res["estimatedTotalHits"], p)
        except Exception:
            pass

    stmt = select(Repo).where(Repo.kind == kind)
    if q:
        stmt = stmt.where(Repo.name.ilike(f"%{q}%") | Repo.description.ilike(f"%{q}%"))
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        if tag_list:
            stmt = stmt.where(or_(*[Repo.tags.contains([tag]) for tag in tag_list]))
    stmt = await filter_by_category_slugs(db, stmt, Repo, category, subcategory)
    stmt = await _team_filter(db, stmt, team)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    if sort == "-downloads":
        stmt = stmt.order_by(Repo.downloads.desc())
    elif sort == "downloads":
        stmt = stmt.order_by(Repo.downloads.asc())
    elif sort == "-likes":
        stmt = stmt.order_by(Repo.likes.desc())
    elif sort == "likes":
        stmt = stmt.order_by(Repo.likes.asc())
    elif sort == "-updated_at":
        stmt = stmt.order_by(Repo.updated_at.desc())
    elif sort == "updated_at":
        stmt = stmt.order_by(Repo.updated_at.asc())
    else:
        stmt = stmt.order_by(Repo.updated_at.desc())
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = []
    for r in rows:
        items.append(await _repo_summary(db, r))
    return paginated(items, total, p)


async def _detail(db, kind, owner, name):
    slug = f"{owner}/{name}"
    r = (
        await db.execute(select(Repo).where(Repo.slug == slug, Repo.kind == kind))
    ).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Aset tidak ditemukan")
    cat, sub = await load_category_refs(db, r.category_id, r.subcategory_id)
    tm = await team_ref(db, r.team_id)
    fr = await _from_room_ref(db, getattr(r, "room_id", None))
    return to_detail(r, cat, sub, tm, fr)


async def _can_edit_repo(db: AsyncSession, repo_id: str, user: User) -> Repo:
    r = await _get_repo(db, repo_id)
    if r.owner_id == user.id:
        return r
    if r.team_id and await membership(db, r.team_id, user.id):
        return r
    if is_staff(user):
        return r
    raise ApiError(403, "forbidden", "Tidak boleh mengubah aset ini")


async def _detail_with_liked_for_repo(db: AsyncSession, r: Repo, user: User | None) -> dict:
    cat, sub = await load_category_refs(db, r.category_id, r.subcategory_id)
    tm = await team_ref(db, r.team_id)
    fr = await _from_room_ref(db, getattr(r, "room_id", None))
    data = to_detail(r, cat, sub, tm, fr)
    liked = False
    if user:
        liked = bool(
            (
                await db.execute(
                    select(RepoLike).where(RepoLike.user_id == user.id, RepoLike.repo_id == r.id)
                )
            ).scalar_one_or_none()
        )
    return {**data, "liked": liked}


async def _detail_with_liked(db, kind, owner, name, user: User | None):
    data = await _detail(db, kind, owner, name)
    liked = False
    if user:
        liked = bool(
            (
                await db.execute(
                    select(RepoLike).where(RepoLike.user_id == user.id, RepoLike.repo_id == data["id"])
                )
            ).scalar_one_or_none()
        )
    return {**data, "liked": liked}


def _register(seg: str, kind: str):
    async def list_ep(
        q: str | None = None,
        tags: str | None = None,
        sort: str | None = None,
        category: str | None = None,
        subcategory: str | None = None,
        team: str | None = None,
        p: PageParams = Depends(page_params),
        db: AsyncSession = Depends(get_db),
    ):
        return await _list(db, kind, q, tags, sort, category, subcategory, team, p)

    async def detail_ep(
        owner: str,
        name: str,
        user: User | None = Depends(get_current_user_optional),
        db: AsyncSession = Depends(get_db),
    ):
        return await _detail_with_liked(db, kind, owner, name, user)

    async def create_ep(
        body: dict,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        team_id = await _resolve_team_id(db, body.get("team_id"), user)
        r = Repo(
            kind=kind,
            owner_id=user.id,
            name=body["name"],
            slug=f"{user.username}/{body['name']}",
            description=body.get("description", ""),
            tags=body.get("tags", []),
            visibility=body.get("visibility", "public"),
            readme_md=body.get("readme_md", ""),
            license=body.get("license"),
            team_id=team_id,
        )
        await apply_category_body(db, body, r)
        db.add(r)
        await db.commit()
        await db.refresh(r, ["owner"])
        try:
            index_repo(r)
        except Exception:
            pass
        await after_repo_created(db, user)
        try:
            await maybe_provision(db, r, user)
            await db.refresh(r)
        except Exception:
            pass
        tm = await team_ref(db, r.team_id)
        return {**to_detail(r, team=tm), "liked": False}

    router.add_api_route(f"/{seg}", list_ep, methods=["GET"])
    router.add_api_route(f"/{seg}/{{owner}}/{{name}}", detail_ep, methods=["GET"])
    router.add_api_route(f"/{seg}", create_ep, methods=["POST"], status_code=201)


for _seg, _kind in KIND_MAP.items():
    _register(_seg, _kind)


@router.get("/discover")
async def discover(db: AsyncSession = Depends(get_db)):
    featured_rows = (
        await db.execute(
            select(Repo)
            .where(Repo.visibility == "public", Repo.featured.is_(True))
            .order_by(Repo.updated_at.desc())
            .limit(6)
        )
    ).scalars().all()
    recent_rows = (
        await db.execute(
            select(Repo)
            .where(Repo.visibility == "public")
            .order_by(Repo.updated_at.desc())
            .limit(6)
        )
    ).scalars().all()
    featured = []
    for r in featured_rows:
        featured.append(await _repo_summary(db, r))
    recent = []
    for r in recent_rows:
        recent.append(await _repo_summary(db, r))
    return {"featured": featured, "recent": recent}


@router.patch("/repos/{repo_id}")
async def update_repo(
    repo_id: str,
    body: RepoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await _can_edit_repo(db, repo_id, user)
    data = body.model_dump(exclude_unset=True)
    category_data = {k: data.pop(k) for k in ("category", "subcategory") if k in data}
    for key, value in data.items():
        setattr(r, key, value)
    if category_data:
        await apply_category_body(db, category_data, r)
    await db.commit()
    await db.refresh(r, ["owner"])
    try:
        index_repo(r)
    except Exception:
        pass
    return await _detail_with_liked_for_repo(db, r, user)


@router.post("/repos/{repo_id}/files", status_code=201)
async def add_file(
    repo_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await _can_edit_repo(db, repo_id, user)
    data = await file.read()
    max_mb = perks_for(user.reputation or 0)["upload_max_mb"]
    if len(data) > max_mb * 1024 * 1024:
        raise ApiError(413, "too_large", f"Ukuran maksimal {max_mb} MB")
    name = file.filename or f"file-{uuid.uuid4().hex}"
    key = f"repos/{repo_id}/{name}"
    try:
        url = upload_asset(key, data, file.content_type or "application/octet-stream")
    except Exception as exc:
        raise ApiError(502, "storage_error", "Gagal mengunggah file") from exc
    entry = {
        "path": name,
        "path_key": key,
        "size_bytes": len(data),
        "type": file.content_type or "application/octet-stream",
        "url": url,
    }
    r.files = [f for f in (r.files or []) if f.get("path") != name] + [entry]
    await db.commit()
    try:
        await mirror_upload(db, r, name, data)
    except Exception:
        pass
    return entry


@router.delete("/repos/{repo_id}/files", status_code=204)
async def remove_file(
    repo_id: str,
    path: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await _can_edit_repo(db, repo_id, user)
    r.files = [f for f in (r.files or []) if f.get("path") != path]
    await db.commit()
    try:
        delete_asset(f"repos/{repo_id}/{path}")
    except Exception:
        pass
    return Response(status_code=204)


@router.post("/repos/{repo_id}/like")
async def like_repo(
    repo_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await _get_repo(db, repo_id)
    key = engagement_service.asset_key(r.kind, r.slug)
    if await engagement_service.has_loved(db, user.id, key):
        stats = await engagement_service.get_stats(db, r.kind, r.slug, user)
        return {"liked": True, "likes": stats["love_count"]}
    result = await engagement_service.toggle_love(db, kind=r.kind, slug=r.slug, actor=user)
    try:
        await db.refresh(r)
        index_repo(r)
    except Exception:
        pass
    return {"liked": result["liked"], "likes": result["love_count"]}


@router.delete("/repos/{repo_id}/like")
async def unlike_repo(
    repo_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await _get_repo(db, repo_id)
    key = engagement_service.asset_key(r.kind, r.slug)
    if not await engagement_service.has_loved(db, user.id, key):
        stats = await engagement_service.get_stats(db, r.kind, r.slug, user)
        return {"liked": False, "likes": stats["love_count"]}
    result = await engagement_service.toggle_love(db, kind=r.kind, slug=r.slug, actor=user)
    try:
        await db.refresh(r)
        index_repo(r)
    except Exception:
        pass
    return {"liked": result["liked"], "likes": result["love_count"]}


@router.get("/repos/{repo_id}/gitea/files")
async def gitea_list_files(
    repo_id: str,
    path: str = "",
    ref: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    r = await _get_repo(db, repo_id)
    if not r.gitea_repo_id:
        raise ApiError(404, "not_linked", "Repo belum terhubung ke Gitea")
    items = await list_repo_files(r, path, ref)
    return {"items": items, "source_of_truth": r.source_of_truth}


@router.get("/repos/{repo_id}/gitea/diff")
async def gitea_diff(
    repo_id: str,
    base: str,
    head: str,
    db: AsyncSession = Depends(get_db),
):
    r = await _get_repo(db, repo_id)
    if not r.gitea_repo_id:
        raise ApiError(404, "not_linked", "Repo belum terhubung ke Gitea")
    return await repo_diff(r, base, head)


@router.post("/repos/{repo_id}/gitea/provision")
async def gitea_provision(
    repo_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await _can_edit_repo(db, repo_id, user)
    if r.gitea_repo_id and r.clone_url:
        return {"linked": True, "clone_url": r.clone_url}
    if not client_or_none():
        raise ApiError(503, "gitea_unavailable", "Layanan Git sementara tidak tersedia")
    try:
        await maybe_provision(db, r, user)
    except Exception as e:
        raise ApiError(502, "provision_failed", "Gagal menghubungkan repositori Git") from e
    await db.refresh(r)
    if not r.clone_url:
        raise ApiError(502, "provision_failed", "Gagal menghubungkan repositori Git")
    return {"linked": True, "clone_url": r.clone_url}


@router.post("/repos/{repo_id}/gitea/flip")
async def gitea_flip_source(
    repo_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await _can_edit_repo(db, repo_id, user)
    if not r.gitea_repo_id:
        raise ApiError(400, "not_linked", "Repositori Git belum diaktifkan untuk aset ini")
    await flip_source(db, r)
    return {"source_of_truth": r.source_of_truth, "clone_url": r.clone_url}
