from datetime import datetime, timezone

import uuid

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.core.storage import upload_public
from app.modules.community.models import Post, Thread
from app.modules.competitions.models import Competition, Submission
from app.modules.events.models import Event, EventRegistration
from app.modules.learn.models import Notebook
from app.modules.repos.models import Repo
from app.modules.repos.schemas import owner_ref
from app.modules.users.member_card import ensure_member_share_token, member_share_url
from app.modules.users.models import User
from app.modules.users.schemas import ProfileOut, ProfileUpdate
from app.modules.users.settings import merged

router = APIRouter(tags=["me"])

IMG = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


@router.patch("/me", response_model=ProfileOut)
async def update_me(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = body.model_dump(exclude_unset=True)
    if "links" in data and data["links"] is not None:
        data["links"] = [l.model_dump() if hasattr(l, "model_dump") else l for l in data["links"]]
    for key, value in data.items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return ProfileOut.from_user(user, include_email=True)


@router.post("/me/accept-tos")
async def accept_tos(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user.accepted_tos_at = datetime.now(timezone.utc)
    user.accepted_tos_version = settings.TOS_VERSION
    await db.commit()
    return {"ok": True}


async def _upload_image(file: UploadFile, user: User, db: AsyncSession, kind: str, max_mb: int) -> str:
    ext = IMG.get(file.content_type or "")
    if not ext:
        raise ApiError(422, "invalid_file", "Format harus jpg, png, atau webp")
    data = await file.read()
    if len(data) > max_mb * 1024 * 1024:
        raise ApiError(413, "too_large", f"Ukuran maksimal {max_mb} MB")
    key = f"{kind}/{user.id}/{uuid.uuid4().hex}.{ext}"
    try:
        url = upload_public(key, data, file.content_type or f"image/{ext}")
    except Exception as exc:
        raise ApiError(502, "storage_error", "Gagal mengunggah file") from exc
    setattr(user, "avatar_url" if kind == "avatars" else "banner_url", url)
    await db.commit()
    return url


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return {"avatar_url": await _upload_image(file, user, db, "avatars", 2)}


@router.post("/me/banner")
async def upload_banner(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return {"banner_url": await _upload_image(file, user, db, "banners", 4)}


@router.get("/me/member-card")
async def get_member_card(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    token = ensure_member_share_token(user)
    await db.commit()
    await db.refresh(user)
    return {"share_token": token, "share_url": member_share_url(token)}


@router.get("/me/submissions")
async def my_submissions(
    user: User = Depends(get_current_user),
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    base = (
        select(Submission, Competition)
        .join(Competition, Submission.competition_id == Competition.id)
        .where(Submission.user_id == user.id)
        .order_by(Submission.created_at.desc())
    )
    total = (
        await db.execute(select(func.count()).select_from(Submission).where(Submission.user_id == user.id))
    ).scalar_one()
    rows = (await db.execute(base.offset(p.offset).limit(p.page_size))).all()
    items = [
        {
            "id": s.id,
            "created_at": s.created_at,
            "status": s.status,
            "public_score": s.public_score,
            "filename": s.filename,
            "competition": {"slug": c.slug, "title": c.title},
        }
        for s, c in rows
    ]
    return paginated(items, total, p)


@router.get("/me/events")
async def my_events(
    user: User = Depends(get_current_user),
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    base = (
        select(EventRegistration, Event)
        .join(Event, EventRegistration.event_id == Event.id)
        .where(EventRegistration.user_id == user.id)
        .order_by(Event.starts_at.asc())
    )
    total = (
        await db.execute(
            select(func.count()).select_from(EventRegistration).where(EventRegistration.user_id == user.id)
        )
    ).scalar_one()
    rows = (await db.execute(base.offset(p.offset).limit(p.page_size))).all()
    items = [
        {
            "registration_id": r.id,
            "status": r.status,
            "event": {
                "slug": e.slug,
                "title": e.title,
                "type": e.type,
                "mode": e.mode,
                "starts_at": e.starts_at,
                "ends_at": e.ends_at,
                "location": e.location,
                "cover_url": e.cover_url,
            },
        }
        for r, e in rows
    ]
    return paginated(items, total, p)


@router.get("/me/onboarding")
async def onboarding(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    async def count(model, cond):
        return (await db.execute(select(func.count()).select_from(model).where(cond))).scalar_one()

    repos = await count(Repo, Repo.owner_id == user.id)
    subs = await count(Submission, Submission.user_id == user.id)
    threads = await count(Thread, Thread.author_id == user.id)

    checklist = {
        "profile_completed": bool(user.avatar_url) and bool(user.bio or user.about_md),
        "email_verified": user.email_verified,
        "interests_selected": len(user.interests or []) > 0,
        "has_asset": repos > 0,
        "joined_competition": subs > 0,
        "joined_discussion": threads > 0,
    }
    return {"onboarded": user.onboarded, "interests": user.interests or [], "checklist": checklist}


@router.post("/me/onboarding/complete")
async def complete_onboarding(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.onboarded = True
    await db.commit()
    return {"onboarded": True}


@router.get("/me/learning")
async def my_learning(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.modules.learn.models import Course, Enrollment, LessonProgress

    enrolls = (await db.execute(select(Enrollment).where(Enrollment.user_id == user.id))).scalars().all()
    now = datetime.now(timezone.utc)
    out = []
    for e in enrolls:
        c = (await db.execute(select(Course).where(Course.slug == e.course_slug))).scalar_one_or_none()
        if not c:
            continue
        expired = bool(e.expires_at and e.expires_at < now)
        lessons = [l for m in (c.modules or []) for l in m.get("lessons", [])]
        done = {
            p.lesson_id
            for p in (
                await db.execute(
                    select(LessonProgress).where(
                        LessonProgress.user_id == user.id,
                        LessonProgress.course_slug == c.slug,
                    )
                )
            ).scalars().all()
        }
        total = len(lessons)
        completed = sum(1 for l in lessons if l["id"] in done)
        nxt = next((l["id"] for l in lessons if l["id"] not in done), None)
        out.append(
            {
                "course": {
                    "slug": c.slug,
                    "title": c.title,
                    "cover_url": c.cover_url,
                    "level": c.level,
                },
                "completed": completed,
                "total": total,
                "percent": round(completed / total * 100) if total else 0,
                "next_lesson_id": nxt,
                "expires_at": e.expires_at,
                "expired": expired,
            }
        )
    return {"items": out}


@router.get("/me/notebooks")
async def my_notebooks(
    user: User = Depends(get_current_user),
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Notebook)
        .options(selectinload(Notebook.owner))
        .where(Notebook.owner_id == user.id)
        .order_by(Notebook.created_at.desc())
    )
    total = (
        await db.execute(select(func.count()).select_from(Notebook).where(Notebook.owner_id == user.id))
    ).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = [
        {
            "id": n.id,
            "title": n.title,
            "tags": n.tags,
            "owner": {
                "username": n.owner.username,
                "type": "user",
                "avatar_url": n.owner.avatar_url,
                "is_official": bool(n.owner.is_official),
            },
        }
        for n in rows
    ]
    return paginated(items, total, p)


@router.get("/me/threads")
async def my_threads(
    user: User = Depends(get_current_user),
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Thread)
        .options(selectinload(Thread.author))
        .where(Thread.author_id == user.id)
        .order_by(Thread.last_activity_at.desc())
    )
    total = (
        await db.execute(select(func.count()).select_from(Thread).where(Thread.author_id == user.id))
    ).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = []
    for t in rows:
        replies = (
            await db.execute(select(func.count()).select_from(Post).where(Post.thread_id == t.id))
        ).scalar_one()
        items.append(
            {
                "id": t.id,
                "title": t.title,
                "author": owner_ref(t.author),
                "tags": t.tags,
                "replies": replies,
                "created_at": t.created_at,
                "last_activity_at": t.last_activity_at,
            }
        )
    return paginated(items, total, p)


@router.get("/me/settings")
async def get_settings(user: User = Depends(get_current_user)):
    return merged(user.settings)


@router.patch("/me/settings")
async def update_settings(
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current = merged(user.settings)
    for section, vals in body.items():
        if section in current and isinstance(vals, dict):
            current[section].update(vals)
    user.settings = current
    await db.commit()
    return current
