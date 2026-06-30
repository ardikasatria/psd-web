import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy import cast, extract, func, select, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.core.ratelimit import rate_limit
from app.core.storage import upload_private, upload_public
from app.modules.categories.service import apply_category_body, filter_by_category_slugs, load_category_refs
from app.modules.competitions.models import (
    Competition,
    CompetitionNotebook,
    CompetitionNotebookFavorite,
    CompetitionProposal,
    Submission,
)
from app.modules.competitions import submission_review
from app.modules.competitions.service import (
    competition_detail_stats,
    competition_hib,
    deadline_payload,
    build_leaderboard_items,
    notebook_items,
    submission_row_dict,
)
from app.modules.notebook.store import NotebookStore
from app.modules.teams.models import Team, TeamMember
from app.modules.competitions.proposals import (
    apply_proposal_body,
    notify_staff_new_proposal,
    proposal_dict,
    submit_proposal,
)
from app.modules.gamification.tiers import perks_for
from app.modules.users.models import User
from app.modules.users.refs import is_staff, owner_ref_dict

router = APIRouter(tags=["competitions"])

IMG = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

SUMMARY = (
    "slug",
    "title",
    "sponsor",
    "status",
    "metric",
    "participants",
    "prize_pool",
    "starts_at",
    "ends_at",
    "cover_url",
    "featured",
)


def _summary(c, category=None, subcategory=None):
    out = {k: getattr(c, k) for k in SUMMARY}
    out["category"] = category
    out["subcategory"] = subcategory
    return out


def _detail(c, category=None, subcategory=None):
    hib = competition_hib(c)
    return {
        **_summary(c, category, subcategory),
        "overview_md": c.overview_md,
        "rules_md": c.rules_md,
        "dataset_info_md": c.dataset_info_md,
        "prizes": c.prizes,
        "tags": c.tags,
        "daily_submission_limit": c.daily_submission_limit,
        "max_score": c.max_score,
        "higher_is_better": hib,
        "metric_direction": "makin tinggi makin baik" if hib else "makin rendah makin baik",
        "deadline": deadline_payload(c),
    }


def _parse_date_param(value: str | None, end_of_day: bool = False) -> datetime | None:
    if not value:
        return None
    try:
        d = date.fromisoformat(value[:10])
    except ValueError:
        return None
    if end_of_day:
        return datetime(d.year, d.month, d.day, 23, 59, 59, tzinfo=timezone.utc)
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)


async def _summaries(db: AsyncSession, rows: list[Competition]) -> list[dict]:
    items = []
    for c in rows:
        cat, sub = await load_category_refs(db, c.category_id, c.subcategory_id)
        items.append(_summary(c, cat, sub))
    return items


@router.get("/competitions/stats")
async def competition_stats(
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(select(func.count()).select_from(Competition))).scalar_one()
    active = (
        await db.execute(select(func.count()).select_from(Competition).where(Competition.status == "active"))
    ).scalar_one()
    upcoming = (
        await db.execute(select(func.count()).select_from(Competition).where(Competition.status == "upcoming"))
    ).scalar_one()
    past = (
        await db.execute(select(func.count()).select_from(Competition).where(Competition.status == "past"))
    ).scalar_one()
    total_participants = (
        await db.execute(select(func.coalesce(func.sum(Competition.participants), 0)))
    ).scalar_one()

    tag_counts: dict[str, int] = {}
    for tags in (await db.execute(select(Competition.tags))).scalars():
        for t in tags or []:
            key = str(t).lower()
            tag_counts[key] = tag_counts.get(key, 0) + 1
    trending_tags = sorted(tag_counts.items(), key=lambda x: -x[1])[:8]

    year_rows = (
        await db.execute(
            select(extract("year", Competition.starts_at).label("y"))
            .distinct()
            .order_by(extract("year", Competition.starts_at).desc())
        )
    ).scalars().all()
    years = [int(y) for y in year_rows if y is not None]

    featured_rows = (
        await db.execute(
            select(Competition)
            .where(Competition.featured.is_(True), Competition.status.in_(["active", "upcoming"]))
            .order_by(Competition.starts_at.asc())
            .limit(3)
        )
    ).scalars().all()
    featured = await _summaries(db, featured_rows)

    hot_rows = (
        await db.execute(
            select(Competition)
            .where(Competition.status == "active")
            .order_by(Competition.participants.desc(), Competition.ends_at.asc())
            .limit(5)
        )
    ).scalars().all()
    hot_active = [
        {
            "slug": c.slug,
            "title": c.title,
            "metric": c.metric,
            "participants": c.participants,
            "prize_pool": c.prize_pool,
            "ends_at": c.ends_at,
        }
        for c in hot_rows
    ]

    my_active = 0
    if viewer:
        my_active = (
            await db.execute(
                select(func.count(func.distinct(Submission.competition_id)))
                .select_from(Submission)
                .join(Competition, Competition.id == Submission.competition_id)
                .where(Submission.user_id == viewer.id, Competition.status == "active")
            )
        ).scalar_one()

    return {
        "total_competitions": total,
        "active": active,
        "upcoming": upcoming,
        "past": past,
        "total_participants": int(total_participants or 0),
        "trending_tags": [{"tag": t, "count": c} for t, c in trending_tags],
        "years": years,
        "featured": featured,
        "hot_active": hot_active,
        "my_active": my_active,
    }


@router.get("/competitions")
async def list_competitions(
    status: str | None = None,
    category: str | None = None,
    subcategory: str | None = None,
    tag: str | None = None,
    sort: str = "date",
    year: int | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Competition)
    if status:
        stmt = stmt.where(Competition.status == status)
    if tag:
        stmt = stmt.where(cast(Competition.tags, String).ilike(f'%"{tag.lower()}"%'))
    if year:
        stmt = stmt.where(extract("year", Competition.starts_at) == year)
    start = _parse_date_param(from_date)
    end = _parse_date_param(to_date, end_of_day=True)
    if start:
        stmt = stmt.where(Competition.starts_at >= start)
    if end:
        stmt = stmt.where(Competition.starts_at <= end)
    stmt = await filter_by_category_slugs(db, stmt, Competition, category, subcategory)
    if sort == "title_asc":
        stmt = stmt.order_by(Competition.title.asc(), Competition.starts_at.desc())
    elif sort == "title_desc":
        stmt = stmt.order_by(Competition.title.desc(), Competition.starts_at.desc())
    else:
        stmt = stmt.order_by(Competition.starts_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated(await _summaries(db, rows), total, p)


async def _get(db, slug) -> Competition:
    c = (await db.execute(select(Competition).where(Competition.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Kompetisi tidak ditemukan")
    return c


@router.get("/competitions/{slug}")
async def get_competition(slug: str, db: AsyncSession = Depends(get_db)):
    c = await _get(db, slug)
    cat, sub = await load_category_refs(db, c.category_id, c.subcategory_id)
    return _detail(c, cat, sub)


@router.get("/competitions/{slug}/stats")
async def competition_slug_stats(slug: str, db: AsyncSession = Depends(get_db)):
    c = await _get(db, slug)
    return await competition_detail_stats(db, c)


@router.get("/competitions/{slug}/leaderboard")
async def leaderboard(
    slug: str,
    board: str = "public",
    viewer: User | None = Depends(get_current_user_optional),
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    c = await _get(db, slug)
    if board == "private" and c.status != "past" and not (viewer and is_staff(viewer)):
        raise ApiError(403, "leaderboard_locked", "Leaderboard privat dibuka setelah kompetisi berakhir")

    items, total = await build_leaderboard_items(db, c, board=board, offset=p.offset, limit=p.page_size)
    return paginated(items, total, p)


def _submission_item(s: Submission) -> dict:
    d = submission_row_dict(s)
    return {
        "id": d["id"],
        "status": d["status"],
        "score": d["public_score"],
        "note": d["note"],
        "review_note": d["review_note"],
        "submitted_at": d["created_at"],
        "created_at": d["created_at"],
        "public_score": d["public_score"],
        "filename": d["filename"] or "submission.csv",
    }


async def _user_submission_stmt(db: AsyncSession, c: Competition, user: User):
    from sqlalchemy import or_

    team_ids = list(
        (await db.execute(select(TeamMember.team_id).where(TeamMember.user_id == user.id))).scalars().all()
    )
    conds = [Submission.user_id == user.id]
    if team_ids:
        conds.append(Submission.team_id.in_(team_ids))
    return (
        select(Submission)
        .where(Submission.competition_id == c.id, or_(*conds))
        .order_by(Submission.created_at.desc())
    )


@router.get("/competitions/{slug}/submissions/me")
async def my_submissions_me(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = await _get(db, slug)
    rows = (await db.execute(await _user_submission_stmt(db, c, user))).scalars().all()
    return [_submission_item(s) for s in rows]


@router.get("/competitions/{slug}/submissions")
async def my_submissions(
    slug: str,
    user: User = Depends(get_current_user),
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    c = await _get(db, slug)
    stmt = await _user_submission_stmt(db, c, user)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_submission_item(s) for s in rows], total, p)


async def _check_daily_limit(db: AsyncSession, c: Competition, user: User) -> tuple[int, int]:
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    used = (
        await db.execute(
            select(func.count())
            .select_from(Submission)
            .where(
                Submission.competition_id == c.id,
                Submission.user_id == user.id,
                Submission.created_at >= start,
            )
        )
    ).scalar_one()
    limit = c.daily_submission_limit + perks_for(user.reputation or 0)["daily_submission_bonus"]
    if used >= limit:
        raise ApiError(429, "limit_reached", "Batas submission/hari tercapai")
    return used, limit


@router.post("/competitions/{slug}/submissions", status_code=201, dependencies=[rate_limit("submit", 10, 60)])
async def submit(
    slug: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = await _get(db, slug)
    dl = deadline_payload(c)
    if not dl["is_open"]:
        raise ApiError(400, "closed", "Pendaftaran/Submission ditutup")

    used, limit = await _check_daily_limit(db, c, user)
    content_type = request.headers.get("content-type", "")

    team_id = None
    notebook_id = None
    note = None
    filename = ""
    file_key = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        upload = form.get("file")
        team_id = form.get("team_id") or None
        notebook_id = form.get("notebook_id") or None
        note = form.get("note") or None
        if upload and hasattr(upload, "read"):
            data = await upload.read()
            if len(data) > 10 * 1024 * 1024:
                raise ApiError(413, "too_large", "Maksimal 10 MB")
            file_key = f"submissions/{c.id}/{user.id}/{uuid.uuid4().hex}.csv"
            upload_private(file_key, data, "text/csv")
            filename = getattr(upload, "filename", None) or "submission.csv"
    else:
        body = await request.json()
        team_id = body.get("team_id")
        notebook_id = body.get("notebook_id")
        note = body.get("note")

    if team_id:
        member = (
            await db.execute(
                select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user.id)
            )
        ).scalar_one_or_none()
        if not member:
            raise ApiError(403, "forbidden", "Anda bukan anggota tim ini")

    s = Submission(
        competition_id=c.id,
        user_id=user.id,
        team_id=team_id,
        notebook_id=notebook_id,
        note=note,
        file_key=file_key,
        filename=filename or "submission",
        status=submission_review.SUBMITTED,
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)

    item = _submission_item(s)
    return {**item, "remaining_today": max(0, limit - used - 1)}


@router.get("/competitions/{slug}/notebooks")
async def list_competition_notebooks(
    slug: str,
    viewer: User | None = Depends(get_current_user_optional),
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    c = await _get(db, slug)
    favorited: set[str] = set()
    if viewer:
        fav_rows = (
            await db.execute(
                select(CompetitionNotebookFavorite.competition_notebook_id).where(
                    CompetitionNotebookFavorite.user_id == viewer.id
                )
            )
        ).scalars().all()
        favorited = set(fav_rows)
    items = await notebook_items(db, c, viewer, favorited)
    total = len(items)
    page = items[p.offset : p.offset + p.page_size]
    return paginated(page, total, p)


@router.post("/competitions/{slug}/notebooks", status_code=201)
async def create_competition_notebook(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = await _get(db, slug)
    store = NotebookStore(db)
    nb = await store.create(user.id, f"Notebook — {c.title}")
    cn = CompetitionNotebook(competition_id=c.id, notebook_id=nb.id, owner_id=user.id)
    db.add(cn)
    await db.commit()
    await db.refresh(cn)
    return {
        "id": cn.id,
        "title": nb.title,
        "owner": owner_ref_dict(user),
        "favorite_count": 0,
        "favorited": False,
        "updated_at": cn.updated_at,
        "notebook_id": nb.id,
    }


@router.post("/competitions/{slug}/notebooks/{notebook_id}/favorite")
async def favorite_competition_notebook(
    slug: str,
    notebook_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = await _get(db, slug)
    cn = (
        await db.execute(
            select(CompetitionNotebook).where(
                CompetitionNotebook.competition_id == c.id,
                CompetitionNotebook.id == notebook_id,
            )
        )
    ).scalar_one_or_none()
    if not cn:
        raise ApiError(404, "not_found", "Notebook kompetisi tidak ditemukan")

    existing = (
        await db.execute(
            select(CompetitionNotebookFavorite).where(
                CompetitionNotebookFavorite.competition_notebook_id == cn.id,
                CompetitionNotebookFavorite.user_id == user.id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        await db.delete(existing)
        cn.favorite_count = max(0, cn.favorite_count - 1)
        favorited = False
    else:
        db.add(CompetitionNotebookFavorite(competition_notebook_id=cn.id, user_id=user.id))
        cn.favorite_count += 1
        favorited = True
    await db.commit()
    await db.refresh(cn)
    return {"favorited": favorited, "favorite_count": cn.favorite_count}


@router.get("/competitions/{slug}/teams")
async def competition_teams(
    slug: str,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    c = await _get(db, slug)
    team_ids = (
        await db.execute(
            select(Submission.team_id)
            .where(Submission.competition_id == c.id, Submission.team_id.isnot(None))
            .distinct()
        )
    ).scalars().all()
    if not team_ids:
        return paginated([], 0, p)
    rows = (await db.execute(select(Team).where(Team.id.in_(team_ids)))).scalars().all()
    items = [{"slug": t.slug, "name": t.name, "avatar_url": t.avatar_url} for t in rows]
    total = len(items)
    return paginated(items[p.offset : p.offset + p.page_size], total, p)


@router.post("/competitions/upload-cover")
async def upload_competition_cover(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    ext = IMG.get(file.content_type or "")
    if not ext:
        raise ApiError(422, "invalid_file", "Format harus jpg, png, atau webp")
    data = await file.read()
    if len(data) > 4 * 1024 * 1024:
        raise ApiError(413, "too_large", "Ukuran maksimal 4 MB")
    key = f"competitions/covers/{user.id}/{uuid.uuid4().hex}.{ext}"
    try:
        url = upload_public(key, data, file.content_type or f"image/{ext}")
    except Exception as exc:
        raise ApiError(502, "storage_error", "Gagal mengunggah cover") from exc
    return {"cover_url": url}


async def _competition_slug_for_proposal(db: AsyncSession, p: CompetitionProposal) -> str | None:
    if not p.competition_id:
        return None
    return (await db.execute(select(Competition.slug).where(Competition.id == p.competition_id))).scalar_one_or_none()


def _parse_dt(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        v = value.strip()
        if v.endswith("Z"):
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        if "T" in v and "+" not in v[-6:] and v.count(":") <= 2:
            return datetime.fromisoformat(f"{v}:00+00:00")
        return datetime.fromisoformat(v)
    raise ApiError(422, "invalid_date", "Format tanggal tidak valid")


@router.get("/me/competition-proposals")
async def list_my_proposals(
    user: User = Depends(get_current_user),
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(CompetitionProposal)
        .where(CompetitionProposal.user_id == user.id)
        .order_by(CompetitionProposal.updated_at.desc())
    )
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = []
    for row in rows:
        slug = await _competition_slug_for_proposal(db, row)
        items.append(await proposal_dict(db, row, competition_slug=slug))
    return paginated(items, total, p)


@router.post("/me/competition-proposals", status_code=201)
async def create_proposal(
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    category_data = {k: body.pop(k) for k in ("category", "subcategory") if k in body}
    submit_now = body.pop("submit", False)
    p = CompetitionProposal(
        user_id=user.id,
        proposed_slug=body.get("proposed_slug") or "",
        title=body["title"],
        sponsor=body.get("sponsor"),
        metric=body.get("metric") or "Accuracy",
        prize_pool=body.get("prize_pool"),
        starts_at=_parse_dt(body["starts_at"]),
        ends_at=_parse_dt(body["ends_at"]),
        cover_url=body.get("cover_url"),
        overview_md=body.get("overview_md") or "",
        rules_md=body.get("rules_md") or "",
        dataset_info_md=body.get("dataset_info_md") or "",
        daily_submission_limit=int(body.get("daily_submission_limit") or 5),
        status="draft",
    )
    await apply_category_body(db, category_data, p)
    db.add(p)
    if submit_now:
        await submit_proposal(db, p)
    await db.commit()
    await db.refresh(p)
    if submit_now:
        await notify_staff_new_proposal(db, p, user.username)
    return {"id": p.id, "status": p.status}


@router.get("/me/competition-proposals/{proposal_id}")
async def get_my_proposal(
    proposal_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = (
        await db.execute(
            select(CompetitionProposal).where(
                CompetitionProposal.id == proposal_id,
                CompetitionProposal.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if not p:
        raise ApiError(404, "not_found", "Pengajuan tidak ditemukan")
    slug = await _competition_slug_for_proposal(db, p)
    return await proposal_dict(db, p, competition_slug=slug)


@router.patch("/me/competition-proposals/{proposal_id}")
async def update_my_proposal(
    proposal_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = (
        await db.execute(
            select(CompetitionProposal).where(
                CompetitionProposal.id == proposal_id,
                CompetitionProposal.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if not p:
        raise ApiError(404, "not_found", "Pengajuan tidak ditemukan")
    if p.status not in ("draft", "revision_requested"):
        raise ApiError(409, "locked", "Pengajuan tidak dapat diedit pada status ini")
    category_data = {k: body.pop(k) for k in ("category", "subcategory") if k in body}
    if "starts_at" in body:
        body["starts_at"] = _parse_dt(body["starts_at"])
    if "ends_at" in body:
        body["ends_at"] = _parse_dt(body["ends_at"])
    apply_proposal_body(p, body)
    if category_data:
        await apply_category_body(db, category_data, p)
    await db.commit()
    await db.refresh(p)
    slug = await _competition_slug_for_proposal(db, p)
    return await proposal_dict(db, p, competition_slug=slug)


@router.post("/me/competition-proposals/{proposal_id}/submit")
async def submit_my_proposal(
    proposal_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = (
        await db.execute(
            select(CompetitionProposal).where(
                CompetitionProposal.id == proposal_id,
                CompetitionProposal.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if not p:
        raise ApiError(404, "not_found", "Pengajuan tidak ditemukan")
    await submit_proposal(db, p)
    await db.commit()
    await db.refresh(p)
    await notify_staff_new_proposal(db, p, user.username)
    return {"id": p.id, "status": p.status}
