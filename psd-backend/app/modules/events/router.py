from datetime import date, datetime, timezone

import uuid

from fastapi import APIRouter, Depends, File, Response, UploadFile
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.core.storage import upload_public
from app.modules.categories.service import apply_category_body, filter_by_category_slugs, load_category_refs
from app.modules.events.models import Event, EventProposal, EventRegistration
from app.modules.events.proposals import (
    apply_proposal_body,
    notify_staff_new_proposal,
    proposal_dict,
    submit_proposal,
)
from app.modules.gamification.tiers import perks_for
from app.modules.users.models import User

router = APIRouter(tags=["events"])
IMG = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
SUMMARY = (
    "slug",
    "title",
    "type",
    "mode",
    "status",
    "starts_at",
    "ends_at",
    "location",
    "cover_url",
    "capacity",
    "featured",
)


async def _registered_count(db: AsyncSession, event_id: str) -> int:
    return (
        await db.execute(
            select(func.count())
            .select_from(EventRegistration)
            .where(
                EventRegistration.event_id == event_id,
                EventRegistration.status == "registered",
            )
        )
    ).scalar_one()


def _ics_dt(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _esc(s: str) -> str:
    return (s or "").replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")


def build_ics(e: Event) -> str:
    loc = e.location or ("Daring" if e.mode == "daring" else "")
    return "\r\n".join(
        [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//PSD//Event//ID",
            "CALSCALE:GREGORIAN",
            "BEGIN:VEVENT",
            f"UID:{e.id}@psd.id",
            f"DTSTAMP:{_ics_dt(datetime.now(timezone.utc))}",
            f"DTSTART:{_ics_dt(e.starts_at)}",
            f"DTEND:{_ics_dt(e.ends_at)}",
            f"SUMMARY:{_esc(e.title)}",
            f"LOCATION:{_esc(loc)}",
            f"DESCRIPTION:{_esc((e.description_md or '')[:500])}",
            "END:VEVENT",
            "END:VCALENDAR",
        ]
    )


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


async def _summaries(db: AsyncSession, rows: list[Event]) -> list[dict]:
    items = []
    for e in rows:
        cat, sub = await load_category_refs(db, e.category_id, e.subcategory_id)
        items.append(
            {
                **{k: getattr(e, k) for k in SUMMARY},
                "gallery_urls": e.gallery_urls or [],
                "registered": await _registered_count(db, e.id),
                "category": cat,
                "subcategory": sub,
            }
        )
    return items


@router.get("/events/stats")
async def event_stats(
    viewer=Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    total_events = (await db.execute(select(func.count()).select_from(Event))).scalar_one()
    upcoming = (
        await db.execute(select(func.count()).select_from(Event).where(Event.status == "upcoming"))
    ).scalar_one()
    past = (
        await db.execute(select(func.count()).select_from(Event).where(Event.status == "past"))
    ).scalar_one()
    total_registered = (
        await db.execute(
            select(func.count())
            .select_from(EventRegistration)
            .where(EventRegistration.status == "registered")
        )
    ).scalar_one()

    type_rows = (
        await db.execute(select(Event.type, func.count()).group_by(Event.type).order_by(func.count().desc()))
    ).all()
    by_type = [{"type": t, "count": c} for t, c in type_rows]

    year_rows = (
        await db.execute(
            select(extract("year", Event.starts_at).label("y"))
            .distinct()
            .order_by(extract("year", Event.starts_at).desc())
        )
    ).scalars().all()
    years = [int(y) for y in year_rows if y is not None]

    featured_rows = (
        await db.execute(
            select(Event)
            .where(Event.featured.is_(True), Event.status == "upcoming")
            .order_by(Event.starts_at.asc())
            .limit(3)
        )
    ).scalars().all()
    featured = await _summaries(db, featured_rows)

    next_rows = (
        await db.execute(
            select(Event).where(Event.status == "upcoming").order_by(Event.starts_at.asc()).limit(5)
        )
    ).scalars().all()
    next_events = [
        {
            "slug": e.slug,
            "title": e.title,
            "type": e.type,
            "starts_at": e.starts_at,
            "registered": await _registered_count(db, e.id),
            "capacity": e.capacity,
        }
        for e in next_rows
    ]

    my_upcoming = 0
    if viewer:
        my_upcoming = (
            await db.execute(
                select(func.count())
                .select_from(EventRegistration)
                .join(Event, Event.id == EventRegistration.event_id)
                .where(
                    EventRegistration.user_id == viewer.id,
                    EventRegistration.status == "registered",
                    Event.status == "upcoming",
                )
            )
        ).scalar_one()

    return {
        "total_events": total_events,
        "upcoming": upcoming,
        "past": past,
        "total_registered": total_registered,
        "by_type": by_type,
        "years": years,
        "featured": featured,
        "next_events": next_events,
        "my_upcoming": my_upcoming,
    }


@router.get("/events")
async def list_events(
    status: str | None = None,
    type: str | None = None,
    category: str | None = None,
    subcategory: str | None = None,
    sort: str = "date",
    year: int | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Event)
    if status:
        stmt = stmt.where(Event.status == status)
    if type:
        stmt = stmt.where(Event.type == type)
    if year:
        stmt = stmt.where(extract("year", Event.starts_at) == year)
    start = _parse_date_param(from_date)
    end = _parse_date_param(to_date, end_of_day=True)
    if start:
        stmt = stmt.where(Event.starts_at >= start)
    if end:
        stmt = stmt.where(Event.starts_at <= end)
    stmt = await filter_by_category_slugs(db, stmt, Event, category, subcategory)
    if sort == "title_asc":
        stmt = stmt.order_by(Event.title.asc(), Event.starts_at.asc())
    elif sort == "title_desc":
        stmt = stmt.order_by(Event.title.desc(), Event.starts_at.asc())
    else:
        stmt = stmt.order_by(Event.starts_at.asc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated(await _summaries(db, rows), total, p)


async def _get(db: AsyncSession, slug: str) -> Event:
    e = (await db.execute(select(Event).where(Event.slug == slug))).scalar_one_or_none()
    if not e:
        raise ApiError(404, "not_found", "Event tidak ditemukan")
    return e


@router.get("/events/{slug}/calendar.ics")
async def event_ics(slug: str, db: AsyncSession = Depends(get_db)):
    e = await _get(db, slug)
    return Response(
        content=build_ics(e),
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="{slug}.ics"'},
    )


@router.get("/events/{slug}")
async def get_event(
    slug: str,
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    e = await _get(db, slug)
    registered = await _registered_count(db, e.id)
    cat, sub = await load_category_refs(db, e.category_id, e.subcategory_id)
    mine = None
    if viewer:
        r = (
            await db.execute(
                select(EventRegistration).where(
                    EventRegistration.event_id == e.id,
                    EventRegistration.user_id == viewer.id,
                )
            )
        ).scalar_one_or_none()
        mine = {"status": r.status} if r else None
    return {
        **{k: getattr(e, k) for k in SUMMARY},
        "gallery_urls": e.gallery_urls or [],
        "registered": registered,
        "spots_left": (None if e.capacity is None else max(0, e.capacity - registered)),
        "my_registration": mine,
        "description_md": e.description_md,
        "agenda": e.agenda,
        "speakers": e.speakers,
        "category": cat,
        "subcategory": sub,
    }


@router.post("/events/{slug}/register", status_code=201)
async def register_event(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    e = await _get(db, slug)
    if e.status == "past":
        raise ApiError(400, "closed", "Pendaftaran telah ditutup")
    existing = (
        await db.execute(
            select(EventRegistration).where(
                EventRegistration.event_id == e.id,
                EventRegistration.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if existing:
        return {"registration_id": existing.id, "status": existing.status}
    count = await _registered_count(db, e.id)
    perks = perks_for(user.reputation or 0)
    if e.capacity is not None and count >= e.capacity and perks["event_priority"]:
        status = "registered"
    else:
        status = "waitlisted" if (e.capacity is not None and count >= e.capacity) else "registered"
    reg = EventRegistration(event_id=e.id, user_id=user.id, status=status)
    db.add(reg)
    await db.commit()
    await db.refresh(reg)
    return {"registration_id": reg.id, "status": reg.status}


@router.delete("/events/{slug}/register")
async def cancel_registration(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    e = await _get(db, slug)
    reg = (
        await db.execute(
            select(EventRegistration).where(
                EventRegistration.event_id == e.id,
                EventRegistration.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if not reg:
        return {"ok": True}
    freed = reg.status == "registered"
    await db.delete(reg)
    await db.commit()
    if freed and e.capacity is not None:
        nxt = (
            await db.execute(
                select(EventRegistration)
                .where(
                    EventRegistration.event_id == e.id,
                    EventRegistration.status == "waitlisted",
                )
                .order_by(EventRegistration.created_at.asc())
            )
        ).scalars().first()
        if nxt:
            nxt.status = "registered"
            await db.commit()
    return {"ok": True}


async def _upload_event_image(user: User, file: UploadFile) -> str:
    ext = IMG.get(file.content_type or "")
    if not ext:
        raise ApiError(422, "invalid_file", "Format harus jpg, png, atau webp")
    data = await file.read()
    if len(data) > 4 * 1024 * 1024:
        raise ApiError(413, "too_large", "Ukuran maksimal 4 MB")
    key = f"events/media/{user.id}/{uuid.uuid4().hex}.{ext}"
    try:
        return upload_public(key, data, file.content_type or f"image/{ext}")
    except Exception as exc:
        raise ApiError(502, "storage_error", "Gagal mengunggah media") from exc


@router.post("/events/upload-cover")
async def upload_event_cover(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    return {"cover_url": await _upload_event_image(user, file)}


@router.post("/events/upload-media")
async def upload_event_media(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    return {"url": await _upload_event_image(user, file)}


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


async def _event_slug_for_proposal(db: AsyncSession, p: EventProposal) -> str | None:
    if not p.event_id:
        return None
    return (await db.execute(select(Event.slug).where(Event.id == p.event_id))).scalar_one_or_none()


@router.get("/me/event-proposals")
async def list_my_event_proposals(
    user: User = Depends(get_current_user),
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(EventProposal).where(EventProposal.user_id == user.id).order_by(EventProposal.updated_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = []
    for row in rows:
        slug = await _event_slug_for_proposal(db, row)
        items.append(await proposal_dict(db, row, event_slug=slug))
    return paginated(items, total, p)


@router.post("/me/event-proposals", status_code=201)
async def create_event_proposal(body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    category_data = {k: body.pop(k) for k in ("category", "subcategory") if k in body}
    submit_now = body.pop("submit", False)
    p = EventProposal(
        user_id=user.id,
        proposed_slug=body.get("proposed_slug") or "",
        title=body["title"],
        type=body.get("type") or "webinar",
        mode=body.get("mode") or "daring",
        starts_at=_parse_dt(body["starts_at"]),
        ends_at=_parse_dt(body["ends_at"]),
        location=body.get("location"),
        cover_url=body.get("cover_url"),
        gallery_urls=body.get("gallery_urls") or [],
        capacity=body.get("capacity"),
        description_md=body.get("description_md") or "",
        agenda=body.get("agenda") or [],
        speakers=body.get("speakers") or [],
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


@router.get("/me/event-proposals/{proposal_id}")
async def get_my_event_proposal(
    proposal_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    p = (
        await db.execute(
            select(EventProposal).where(EventProposal.id == proposal_id, EventProposal.user_id == user.id)
        )
    ).scalar_one_or_none()
    if not p:
        raise ApiError(404, "not_found", "Pengajuan tidak ditemukan")
    slug = await _event_slug_for_proposal(db, p)
    return await proposal_dict(db, p, event_slug=slug)


@router.patch("/me/event-proposals/{proposal_id}")
async def update_my_event_proposal(
    proposal_id: str, body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    p = (
        await db.execute(
            select(EventProposal).where(EventProposal.id == proposal_id, EventProposal.user_id == user.id)
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
    slug = await _event_slug_for_proposal(db, p)
    return await proposal_dict(db, p, event_slug=slug)


@router.post("/me/event-proposals/{proposal_id}/submit")
async def submit_my_event_proposal(
    proposal_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    p = (
        await db.execute(
            select(EventProposal).where(EventProposal.id == proposal_id, EventProposal.user_id == user.id)
        )
    ).scalar_one_or_none()
    if not p:
        raise ApiError(404, "not_found", "Pengajuan tidak ditemukan")
    await submit_proposal(db, p)
    await db.commit()
    await db.refresh(p)
    await notify_staff_new_proposal(db, p, user.username)
    return {"id": p.id, "status": p.status}
