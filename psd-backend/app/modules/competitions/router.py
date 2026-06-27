import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import cast, extract, func, select, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.core.ratelimit import rate_limit
from app.core.storage import get_object_bytes, upload_private, upload_public
from app.modules.categories.service import apply_category_body, filter_by_category_slugs, load_category_refs
from app.modules.competitions.models import Competition, CompetitionProposal, Submission
from app.modules.competitions.proposals import (
    apply_proposal_body,
    notify_staff_new_proposal,
    proposal_dict,
    submit_proposal,
)
from app.modules.competitions.scoring import higher_is_better, parse_ground_truth, score
from app.modules.gamification.service import award_reputation
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
    return {
        **_summary(c, category, subcategory),
        "overview_md": c.overview_md,
        "rules_md": c.rules_md,
        "dataset_info_md": c.dataset_info_md,
        "prizes": c.prizes,
        "tags": c.tags,
        "daily_submission_limit": c.daily_submission_limit,
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

    rows = (
        await db.execute(
            select(Submission, User)
            .join(User, Submission.user_id == User.id)
            .where(Submission.competition_id == c.id, Submission.status == "scored")
        )
    ).all()
    hib = higher_is_better(c.metric)
    best: dict = {}
    for s, u in rows:
        sc = s.private_score if board == "private" else s.public_score
        if sc is None:
            continue
        cur = best.get(u.id)
        if cur is None or (sc > cur[0]) == hib:
            best[u.id] = (sc, u, s.created_at)

    ranked = sorted(best.values(), key=lambda x: x[0], reverse=hib)
    total = len(ranked)
    page = ranked[p.offset : p.offset + p.page_size]
    items = [
        {
            "rank": p.offset + i + 1,
            "score": sc,
            "submitted_at": ts,
            "participant": owner_ref_dict(u),
        }
        for i, (sc, u, ts) in enumerate(page)
    ]
    return paginated(items, total, p)


@router.get("/competitions/{slug}/submissions")
async def my_submissions(
    slug: str,
    user: User = Depends(get_current_user),
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    c = await _get(db, slug)
    stmt = (
        select(Submission)
        .where(Submission.competition_id == c.id, Submission.user_id == user.id)
        .order_by(Submission.created_at.desc())
    )
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = [
        {
            "id": s.id,
            "created_at": s.created_at,
            "status": s.status,
            "public_score": s.public_score,
            "filename": s.filename,
        }
        for s in rows
    ]
    return paginated(items, total, p)


@router.post("/competitions/{slug}/submissions", status_code=201, dependencies=[rate_limit("submit", 10, 60)])
async def submit(
    slug: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = await _get(db, slug)
    if c.status != "active":
        raise ApiError(400, "closed", "Kompetisi tidak menerima submission saat ini")

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
    if used >= c.daily_submission_limit + perks_for(user.reputation or 0)["daily_submission_bonus"]:
        raise ApiError(
            429,
            "limit_reached",
            f"Batas submission/hari tercapai",
        )

    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise ApiError(413, "too_large", "Maksimal 10 MB")
    key = f"submissions/{c.id}/{user.id}/{uuid.uuid4().hex}.csv"
    upload_private(key, data, "text/csv")

    s = Submission(
        competition_id=c.id,
        user_id=user.id,
        file_key=key,
        filename=file.filename or "submission.csv",
        status="queued",
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)

    if c.ground_truth_key:
        try:
            gt = parse_ground_truth(get_object_bytes(c.ground_truth_key))
            s.public_score, s.private_score = score(gt, data, c.metric)
            s.status = "scored"
        except Exception:
            s.status = "failed"
        await db.commit()
        await db.refresh(s)
        if s.status == "scored":
            await award_reputation(db, user, "submission_scored")

    limit = c.daily_submission_limit + perks_for(user.reputation or 0)["daily_submission_bonus"]
    return {
        "id": s.id,
        "created_at": s.created_at,
        "status": s.status,
        "public_score": s.public_score,
        "filename": s.filename,
        "remaining_today": max(0, limit - used - 1),
    }


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
