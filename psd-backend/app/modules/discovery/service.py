"""Query DB & layanan penemuan komunitas."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.discovery import panels
from app.modules.discovery.ranking import new_members, popularity_score, rank_by
from app.modules.gamification.models import UserBadge
from app.modules.gamification.service import BADGES
from app.modules.gamification.tiers import tier_for
from app.modules.social.models import Follow
from app.modules.users.models import User
from app.modules.users.settings import is_searchable, merged

POOL_LIMIT = 80
NEW_DAYS = 14


def _user_type(u: User) -> str:
    return "org" if u.account_type == "organization" else "user"


def _is_discoverable(u: User) -> bool:
    if not u.is_active:
        return False
    return merged(u.settings)["privacy"]["profile_visibility"] == "public" and is_searchable(u.settings)


def _user_dict(u: User, *, top_badge: str | None = None) -> dict:
    rep = u.reputation or 0
    tier = tier_for(rep)
    d = {
        "id": u.id,
        "username": u.username,
        "type": _user_type(u),
        "avatar_url": u.avatar_url,
        "is_official": u.is_official,
        "reputation": rep,
        "tier": tier.get("name"),
        "affiliation": u.affiliation,
        "follower_count": u.follower_count or 0,
        "post_like_total": u.post_like_total or 0,
        "created_at": u.created_at,
        "top_badge": top_badge,
    }
    if u.account_type == "organization":
        d["org_id"] = u.id
        d["org_name"] = u.name
    return d


def _me_dict(u: User) -> dict:
    d = _user_dict(u)
    if u.account_type != "organization" and u.affiliation:
        d["affiliation"] = u.affiliation
    return d


async def _following_ids(db: AsyncSession, user_id: str) -> set[str]:
    rows = (
        await db.execute(select(Follow.following_id).where(Follow.follower_id == user_id))
    ).scalars().all()
    return set(rows)


async def _discoverable_users(db: AsyncSession, limit: int = POOL_LIMIT) -> list[User]:
    rows = (await db.execute(select(User).where(User.is_active.is_(True)).limit(limit * 2))).scalars().all()
    return [u for u in rows if _is_discoverable(u)][:limit]


async def _top_tier_pool(db: AsyncSession, limit: int) -> list[dict]:
    rows = (
        await db.execute(select(User).where(User.is_active.is_(True)).order_by(User.reputation.desc()).limit(limit * 2))
    ).scalars().all()
    return [_user_dict(u) for u in rows if _is_discoverable(u)][:limit]


async def _popular_pool(db: AsyncSession, limit: int) -> list[dict]:
    rows = (
        await db.execute(
            select(User).where(User.is_active.is_(True)).order_by(User.follower_count.desc()).limit(limit * 2)
        )
    ).scalars().all()
    return [_user_dict(u) for u in rows if _is_discoverable(u)][:limit]


async def _new_pool(db: AsyncSession, limit: int) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=NEW_DAYS)
    rows = (
        await db.execute(
            select(User)
            .where(User.is_active.is_(True), User.created_at >= cutoff)
            .order_by(User.created_at.desc())
            .limit(limit * 2)
        )
    ).scalars().all()
    return [_user_dict(u) for u in rows if _is_discoverable(u)][:limit]


async def _achievements_pool(db: AsyncSession, limit: int) -> list[dict]:
    badge_priority = {"gold": 3, "silver": 2, "bronze": 1}
    rows = (
        await db.execute(
            select(UserBadge, User)
            .join(User, User.id == UserBadge.user_id)
            .where(User.is_active.is_(True))
            .order_by(UserBadge.awarded_at.desc())
            .limit(limit * 3)
        )
    ).all()
    out: list[dict] = []
    seen: set[str] = set()
    scored: list[tuple[int, dict]] = []
    for badge, user in rows:
        if user.id in seen or not _is_discoverable(user):
            continue
        seen.add(user.id)
        meta = BADGES.get(badge.badge_id)
        badge_name = meta[0] if meta else badge.badge_id
        tier = meta[1] if meta else "bronze"
        scored.append((badge_priority.get(tier, 0), _user_dict(user, top_badge=badge_name)))
    scored.sort(key=lambda x: x[0], reverse=True)
    out = [d for _, d in scored[:limit]]
    return out


async def _affiliation_pool(db: AsyncSession, me: User, limit: int) -> list[dict]:
    clauses = []
    if me.affiliation:
        clauses.append(func.lower(User.affiliation) == me.affiliation.strip().lower())
    if me.account_type == "organization":
        clauses.append(User.account_type == "organization")
    elif me.affiliation:
        pass
    else:
        return []
    if not clauses:
        return []
    stmt = select(User).where(User.is_active.is_(True), User.id != me.id, or_(*clauses)).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return [_user_dict(u) for u in rows if _is_discoverable(u)]


async def get_panels(db: AsyncSession, viewer: User | None, *, limit: int = 8) -> dict:
    me = _me_dict(viewer) if viewer else None
    following = await _following_ids(db, viewer.id) if viewer else set()
    return panels.build_discovery(
        me,
        top_tier_pool=await _top_tier_pool(db, POOL_LIMIT),
        popular_pool=await _popular_pool(db, POOL_LIMIT),
        new_pool=await _new_pool(db, POOL_LIMIT),
        achievements=await _achievements_pool(db, POOL_LIMIT),
        affiliation_pool=await _affiliation_pool(db, viewer, POOL_LIMIT) if viewer else [],
        following_ids=following,
        limit=limit,
    )


_LIST_BUILDERS = {
    "top-tier": lambda pool, ex, lim: rank_by(pool, lambda u: u.get("reputation", 0), limit=lim, exclude_ids=ex),
    "popular": lambda pool, ex, lim: rank_by(pool, popularity_score, limit=lim, exclude_ids=ex),
    "new": lambda pool, ex, lim: new_members(pool, limit=lim, exclude_ids=ex),
}


def _ref_from_user(u: dict, kind: str) -> dict:
    if kind == "top-tier":
        reason = f"Tier {u.get('tier') or '—'}"
    elif kind == "popular":
        n = u.get("follower_count", 0)
        reason = f"{n/1000:.1f}rb pengikut".replace(".0", "") if n >= 1000 else f"{n} pengikut"
    elif kind == "new":
        reason = "Anggota baru"
    elif kind == "achievements":
        reason = f"Meraih {u.get('top_badge') or 'pencapaian'}"
    else:
        reason = u.get("_reason") or "Sesama afiliasi"
    return panels._ref(u, reason)


async def get_list(
    db: AsyncSession,
    kind: str,
    viewer: User | None,
    *,
    offset: int,
    page_size: int,
) -> tuple[list[dict], int]:
    ex = {viewer.id} if viewer else set()
    following = await _following_ids(db, viewer.id) if viewer else set()

    if kind == "similar":
        if not viewer:
            return [], 0
        pool = await _affiliation_pool(db, viewer, POOL_LIMIT)
        from app.modules.discovery.affinity import suggest_affiliation

        me = _me_dict(viewer)
        items = suggest_affiliation(me, pool, following_ids=following, limit=POOL_LIMIT)
        total = len(items)
        page = items[offset : offset + page_size]
        return [_ref_from_user(u, kind) for u in page], total

    if kind == "achievements":
        pool = await _achievements_pool(db, POOL_LIMIT)
        items = [u for u in pool if u.get("id") not in ex]
        total = len(items)
        page = items[offset : offset + page_size]
        return [_ref_from_user(u, kind) for u in page], total

    builder = _LIST_BUILDERS.get(kind)
    if not builder:
        return [], 0

    if kind == "top-tier":
        pool = await _top_tier_pool(db, POOL_LIMIT)
    elif kind == "popular":
        pool = await _popular_pool(db, POOL_LIMIT)
    else:
        pool = await _new_pool(db, POOL_LIMIT)

    ranked = builder(pool, ex, POOL_LIMIT)
    total = len(ranked)
    page = ranked[offset : offset + page_size]
    return [_ref_from_user(u, kind) for u in page], total
