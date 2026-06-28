"""Query kandidat, popularitas, & status pengguna untuk asisten (Langkah 57)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.assistant.affinity import from_psd_activity_summary
from app.modules.activity.models import ActivityEvent
from app.modules.categories.models import Category
from app.modules.competitions.models import Competition, Submission
from app.modules.gamification.tiers import tier_for
from app.modules.learn.models import Course, LessonProgress
from app.modules.repos.models import Repo
from app.modules.rooms.models import IdeaRoom
from app.modules.teams.models import TeamMember
from app.modules.users.models import User


async def _category_map(db: AsyncSession) -> dict[str, str]:
    rows = (await db.execute(select(Category.id, Category.slug))).all()
    return {cid: slug for cid, slug in rows}


async def fetch_activity_summary(db: AsyncSession, user: User) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=30)
    base = ActivityEvent.user_id == user.id

    rows = (
        await db.execute(
            select(ActivityEvent.category_id, func.count())
            .where(base, ActivityEvent.created_at >= since, ActivityEvent.category_id.isnot(None))
            .group_by(ActivityEvent.category_id)
            .order_by(func.count().desc())
            .limit(8)
        )
    ).all()
    cats = []
    for cid, n in rows:
        c = (await db.execute(select(Category).where(Category.id == cid))).scalar_one_or_none()
        if c:
            cats.append({"slug": c.slug, "name": c.name, "count": n})

    evs = (
        await db.execute(select(ActivityEvent.meta).where(base, ActivityEvent.created_at >= since))
    ).scalars().all()
    tagc: dict[str, int] = {}
    for m in evs:
        for t in (m or {}).get("tags", []):
            tagc[t] = tagc.get(t, 0) + 1
    top_tags = sorted(tagc.items(), key=lambda x: -x[1])[:10]

    acts = dict(
        (a, n)
        for a, n in (
            await db.execute(
                select(ActivityEvent.action, func.count())
                .where(base, ActivityEvent.created_at >= since)
                .group_by(ActivityEvent.action)
            )
        ).all()
    )

    return from_psd_activity_summary(
        {
            "top_categories": cats,
            "top_tags": [{"tag": t, "count": n} for t, n in top_tags],
            "actions": acts,
        }
    )


async def fetch_viewed_ids(db: AsyncSession, user: User, *, days: int = 14) -> set[str]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        await db.execute(
            select(ActivityEvent.entity_id)
            .where(
                ActivityEvent.user_id == user.id,
                ActivityEvent.created_at >= since,
                ActivityEvent.entity_id.isnot(None),
            )
            .distinct()
        )
    ).scalars().all()
    return {r for r in rows if r}


async def fetch_candidates(db: AsyncSession, kind: str) -> list[dict]:
    cat_map = await _category_map(db)
    if kind == "dataset":
        rows = (
            await db.execute(
                select(Repo, User)
                .join(User, Repo.owner_id == User.id)
                .where(Repo.kind == "dataset", Repo.visibility == "public")
                .order_by(Repo.likes.desc(), Repo.downloads.desc())
                .limit(60)
            )
        ).all()
        return [
            {
                "id": r.slug,
                "slug": r.slug,
                "title": r.name,
                "categories": [cat_map[r.category_id]] if r.category_id and r.category_id in cat_map else [],
                "tags": list(r.tags or []),
                "href": f"/datasets/{u.username}/{r.name}",
            }
            for r, u in rows
        ]

    if kind == "course":
        rows = (
            await db.execute(
                select(Course).where(Course.status == "published").order_by(Course.published_at.desc().nullslast()).limit(60)
            )
        ).scalars().all()
        return [
            {
                "id": c.slug,
                "slug": c.slug,
                "title": c.title,
                "categories": [cat_map[c.category_id]] if c.category_id and c.category_id in cat_map else [],
                "tags": [],
                "href": f"/learn/{c.slug}",
            }
            for c in rows
        ]

    if kind == "kompetisi":
        rows = (
            await db.execute(
                select(Competition)
                .where(Competition.status.in_(("active", "upcoming")))
                .order_by(Competition.participants.desc())
                .limit(60)
            )
        ).scalars().all()
        return [
            {
                "id": c.slug,
                "slug": c.slug,
                "title": c.title,
                "categories": [cat_map[c.category_id]] if c.category_id and c.category_id in cat_map else [],
                "tags": list(c.tags or []),
                "href": f"/competitions/{c.slug}",
            }
            for c in rows
        ]

    if kind == "ruang":
        rows = (
            await db.execute(
                select(IdeaRoom)
                .where(IdeaRoom.status.in_(("open", "framing")))
                .order_by(IdeaRoom.created_at.desc())
                .limit(60)
            )
        ).scalars().all()
        member_counts: dict[str, int] = {}
        if rows:
            team_ids = [r.team_id for r in rows]
            counts = (
                await db.execute(
                    select(TeamMember.team_id, func.count())
                    .where(TeamMember.team_id.in_(team_ids))
                    .group_by(TeamMember.team_id)
                )
            ).all()
            member_counts = {tid: n for tid, n in counts}
        return [
            {
                "id": r.slug,
                "slug": r.slug,
                "title": r.title,
                "categories": [cat_map[r.category_id]] if r.category_id and r.category_id in cat_map else [],
                "tags": [],
                "href": f"/idea-rooms/{r.slug}",
                "member_count": member_counts.get(r.team_id, 0),
            }
            for r in rows
        ]

    return []


async def fetch_popularity(db: AsyncSession, kind: str) -> dict[str, int]:
    if kind == "dataset":
        rows = (
            await db.execute(
                select(Repo.slug, Repo.likes, Repo.downloads).where(Repo.kind == "dataset", Repo.visibility == "public")
            )
        ).all()
        return {slug: int(likes or 0) + int(dl or 0) for slug, likes, dl in rows}

    if kind == "course":
        rows = (await db.execute(select(Course.slug, Course.level).where(Course.status == "published"))).all()
        weight = {"beginner": 10, "intermediate": 20, "advanced": 30}
        return {slug: weight.get(level, 5) for slug, level in rows}

    if kind == "kompetisi":
        rows = (await db.execute(select(Competition.slug, Competition.participants))).all()
        return {slug: int(p or 0) for slug, p in rows}

    if kind == "ruang":
        candidates = await fetch_candidates(db, "ruang")
        return {c["id"]: int(c.get("member_count", 0)) for c in candidates}

    return {}


async def fetch_user_state(db: AsyncSession, user: User) -> dict:
    completed_courses = (
        await db.execute(
            select(func.count(func.distinct(LessonProgress.course_slug))).where(LessonProgress.user_id == user.id)
        )
    ).scalar_one() or 0

    joined_competitions = (
        await db.execute(select(func.count(func.distinct(Submission.competition_id))).where(Submission.user_id == user.id))
    ).scalar_one() or 0

    has_published_dataset = (
        await db.execute(
            select(func.count()).select_from(Repo).where(Repo.owner_id == user.id, Repo.kind == "dataset")
        )
    ).scalar_one() or 0

    rep = user.reputation or 0
    tier = tier_for(rep)
    return {
        "completed_courses": int(completed_courses),
        "joined_competitions": int(joined_competitions),
        "has_published_dataset": has_published_dataset > 0,
        "points": rep,
        "next_tier_points": tier.get("next_at"),
        "tier_name": tier.get("name"),
    }
