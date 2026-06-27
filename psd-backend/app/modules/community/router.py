from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.community.engagement import (
    ALLOWED_EMOJIS,
    engagement_for_one,
    engagement_for_targets,
)
from app.modules.community.models import ForumReaction, ForumVote, Post, Thread
from app.modules.gamification.service import after_forum_post, after_forum_thread
from app.modules.repos.models import Repo
from app.modules.repos.schemas import owner_ref
from app.modules.users.models import User

router = APIRouter(tags=["community"])


async def _replies(db, tid):
    return (
        await db.execute(select(func.count()).select_from(Post).where(Post.thread_id == tid))
    ).scalar_one()


def _summary(t, replies, engagement: dict | None = None):
    out = {
        "id": t.id,
        "title": t.title,
        "author": owner_ref(t.author),
        "tags": t.tags,
        "replies": replies,
        "created_at": t.created_at,
        "last_activity_at": t.last_activity_at,
    }
    if engagement:
        out.update(engagement)
    return out


def _forum_base():
    return Thread.repo_id.is_(None)


async def _set_vote(db, user: User, target_type: str, target_id: str, value: int) -> dict:
    existing = (
        await db.execute(
            select(ForumVote).where(
                ForumVote.user_id == user.id,
                ForumVote.target_type == target_type,
                ForumVote.target_id == target_id,
            )
        )
    ).scalar_one_or_none()

    if value == 0:
        if existing:
            await db.delete(existing)
    elif existing:
        existing.value = value
    else:
        db.add(
            ForumVote(
                user_id=user.id,
                target_type=target_type,
                target_id=target_id,
                value=value,
            )
        )
    await db.commit()
    return await engagement_for_one(db, target_type, target_id, user.id)


async def _toggle_reaction(db, user: User, target_type: str, target_id: str, emoji: str) -> dict:
    if emoji not in ALLOWED_EMOJIS:
        raise ApiError(400, "bad_request", "Emoji tidak didukung")
    existing = (
        await db.execute(
            select(ForumReaction).where(
                ForumReaction.user_id == user.id,
                ForumReaction.target_type == target_type,
                ForumReaction.target_id == target_id,
                ForumReaction.emoji == emoji,
            )
        )
    ).scalar_one_or_none()
    if existing:
        await db.delete(existing)
    else:
        db.add(
            ForumReaction(
                user_id=user.id,
                target_type=target_type,
                target_id=target_id,
                emoji=emoji,
            )
        )
    await db.commit()
    return await engagement_for_one(db, target_type, target_id, user.id)


@router.get("/forum/stats")
async def forum_stats(
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    base = _forum_base()
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    total_threads = (await db.execute(select(func.count()).select_from(Thread).where(base))).scalar_one()
    forum_ids = select(Thread.id).where(base)
    total_replies = (
        await db.execute(select(func.count()).select_from(Post).where(Post.thread_id.in_(forum_ids)))
    ).scalar_one()
    active_this_week = (
        await db.execute(
            select(func.count()).select_from(Thread).where(base, Thread.last_activity_at >= week_ago)
        )
    ).scalar_one()

    tag_rows = (await db.execute(select(Thread.tags).where(base))).scalars().all()
    tag_counts: dict[str, int] = {}
    for tags in tag_rows:
        for tag in tags or []:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    trending_tags = sorted(tag_counts.items(), key=lambda x: -x[1])[:8]

    hot_rows = (
        await db.execute(select(Thread).where(base).order_by(Thread.last_activity_at.desc()).limit(5))
    ).scalars().all()
    hot_ids = [t.id for t in hot_rows]
    hot_eng = await engagement_for_targets(db, "thread", hot_ids, viewer.id if viewer else None)
    hot_threads = [_summary(t, await _replies(db, t.id), hot_eng.get(t.id)) for t in hot_rows]

    activity: dict[str, int] = defaultdict(int)
    for aid in (await db.execute(select(Thread.author_id).where(base, Thread.created_at >= week_ago))).scalars():
        activity[aid] += 2
    for aid in (
        await db.execute(
            select(Post.author_id)
            .join(Thread, Post.thread_id == Thread.id)
            .where(base, Post.created_at >= week_ago)
        )
    ).scalars():
        activity[aid] += 1

    people_of_week = []
    for aid in sorted(activity.keys(), key=lambda k: activity[k], reverse=True)[:5]:
        u = (await db.execute(select(User).where(User.id == aid))).scalar_one_or_none()
        if u:
            people_of_week.append({"user": owner_ref(u), "score": activity[aid]})

    return {
        "total_threads": total_threads,
        "total_replies": total_replies,
        "active_this_week": active_this_week,
        "trending_tags": [{"tag": t, "count": c} for t, c in trending_tags],
        "hot_threads": hot_threads,
        "people_of_week": people_of_week,
    }


@router.get("/forum/threads")
async def list_threads(
    q: str | None = None,
    tags: str | None = None,
    sort: str | None = None,
    p: PageParams = Depends(page_params),
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Thread).where(_forum_base())
    if q:
        stmt = stmt.where(Thread.title.ilike(f"%{q}%"))
    if tags:
        for tag in [t.strip() for t in tags.split(",") if t.strip()]:
            stmt = stmt.where(Thread.tags.contains([tag]))
    if sort == "top":
        vote_sub = (
            select(
                ForumVote.target_id,
                func.coalesce(func.sum(ForumVote.value), 0).label("score"),
            )
            .where(ForumVote.target_type == "thread")
            .group_by(ForumVote.target_id)
            .subquery()
        )
        stmt = stmt.outerjoin(vote_sub, Thread.id == vote_sub.c.target_id).order_by(
            vote_sub.c.score.desc().nullslast(),
            Thread.last_activity_at.desc(),
        )
    else:
        stmt = stmt.order_by(Thread.last_activity_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    ids = [t.id for t in rows]
    eng = await engagement_for_targets(db, "thread", ids, viewer.id if viewer else None)
    return paginated([_summary(t, await _replies(db, t.id), eng.get(t.id)) for t in rows], total, p)


@router.get("/forum/threads/{thread_id}")
async def get_thread(
    thread_id: str,
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    t = (await db.execute(select(Thread).where(Thread.id == thread_id))).scalar_one_or_none()
    if not t:
        raise ApiError(404, "not_found", "Utas tidak ditemukan")
    posts = (
        await db.execute(
            select(Post).where(Post.thread_id == t.id).order_by(Post.created_at.asc())
        )
    ).scalars().all()
    post_ids = [p.id for p in posts]
    thread_eng = await engagement_for_targets(db, "thread", [t.id], viewer.id if viewer else None)
    post_eng = await engagement_for_targets(db, "post", post_ids, viewer.id if viewer else None)
    return {
        **_summary(t, len(posts), thread_eng.get(t.id)),
        "body_md": t.body_md,
        "posts": [
            {
                "id": p.id,
                "author": owner_ref(p.author),
                "body_md": p.body_md,
                "created_at": p.created_at,
                **post_eng.get(p.id, {}),
            }
            for p in posts
        ],
    }


@router.put("/forum/threads/{thread_id}/vote")
async def vote_thread(
    thread_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = (await db.execute(select(Thread).where(Thread.id == thread_id))).scalar_one_or_none()
    if not t:
        raise ApiError(404, "not_found", "Utas tidak ditemukan")
    value = body.get("value")
    if value not in (1, -1, 0):
        raise ApiError(400, "bad_request", "Nilai vote harus 1, -1, atau 0")
    return await _set_vote(db, user, "thread", thread_id, value)


@router.put("/forum/posts/{post_id}/vote")
async def vote_post(
    post_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not p:
        raise ApiError(404, "not_found", "Balasan tidak ditemukan")
    value = body.get("value")
    if value not in (1, -1, 0):
        raise ApiError(400, "bad_request", "Nilai vote harus 1, -1, atau 0")
    return await _set_vote(db, user, "post", post_id, value)


@router.put("/forum/threads/{thread_id}/reactions")
async def react_thread(
    thread_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = (await db.execute(select(Thread).where(Thread.id == thread_id))).scalar_one_or_none()
    if not t:
        raise ApiError(404, "not_found", "Utas tidak ditemukan")
    emoji = (body.get("emoji") or "").strip()
    if not emoji:
        raise ApiError(400, "bad_request", "Emoji wajib diisi")
    return await _toggle_reaction(db, user, "thread", thread_id, emoji)


@router.put("/forum/posts/{post_id}/reactions")
async def react_post(
    post_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not p:
        raise ApiError(404, "not_found", "Balasan tidak ditemukan")
    emoji = (body.get("emoji") or "").strip()
    if not emoji:
        raise ApiError(400, "bad_request", "Emoji wajib diisi")
    return await _toggle_reaction(db, user, "post", post_id, emoji)


@router.post("/forum/threads", status_code=201)
async def create_thread(
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    title = (body.get("title") or "").strip()
    if not title:
        raise ApiError(400, "bad_request", "Judul wajib diisi")
    t = Thread(
        title=title,
        author_id=user.id,
        body_md=body.get("body_md", ""),
        tags=body.get("tags", []),
    )
    db.add(t)
    await db.commit()
    await db.refresh(t, ["author"])
    await after_forum_thread(db, user)
    return await get_thread(t.id, user, db)


@router.post("/forum/threads/{thread_id}/posts", status_code=201)
async def create_reply(
    thread_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = (await db.execute(select(Thread).where(Thread.id == thread_id))).scalar_one_or_none()
    if not t:
        raise ApiError(404, "not_found", "Utas tidak ditemukan")
    text = (body.get("body_md") or "").strip()
    if not text:
        raise ApiError(400, "bad_request", "Balasan tidak boleh kosong")
    p = Post(thread_id=t.id, author_id=user.id, body_md=text)
    t.last_activity_at = datetime.now(timezone.utc)
    db.add(p)
    await db.commit()
    await db.refresh(p, ["author"])
    await after_forum_post(db, user)
    eng = await engagement_for_one(db, "post", p.id, user.id)
    return {
        "id": p.id,
        "author": owner_ref(p.author),
        "body_md": p.body_md,
        "created_at": p.created_at,
        **eng,
    }


@router.get("/repos/{repo_id}/discussions")
async def repo_discussions(
    repo_id: str,
    p: PageParams = Depends(page_params),
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    if not (await db.execute(select(Repo).where(Repo.id == repo_id))).scalar_one_or_none():
        raise ApiError(404, "not_found", "Aset tidak ditemukan")
    stmt = select(Thread).where(Thread.repo_id == repo_id).order_by(Thread.last_activity_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    ids = [t.id for t in rows]
    eng = await engagement_for_targets(db, "thread", ids, viewer.id if viewer else None)
    return paginated([_summary(t, await _replies(db, t.id), eng.get(t.id)) for t in rows], total, p)


@router.post("/repos/{repo_id}/discussions", status_code=201)
async def create_repo_discussion(
    repo_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not (await db.execute(select(Repo).where(Repo.id == repo_id))).scalar_one_or_none():
        raise ApiError(404, "not_found", "Aset tidak ditemukan")
    title = (body.get("title") or "").strip()
    if not title:
        raise ApiError(400, "bad_request", "Judul wajib diisi")
    t = Thread(
        title=title,
        author_id=user.id,
        body_md=body.get("body_md", ""),
        tags=body.get("tags", []),
        repo_id=repo_id,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t, ["author"])
    await after_forum_thread(db, user)
    return await get_thread(t.id, user, db)
