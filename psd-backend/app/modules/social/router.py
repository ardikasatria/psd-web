import re
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.core.ratelimit import rate_limit
from app.core.storage import upload_public
from app.modules.gamification.service import after_comment, after_follow, after_post_liked
from app.modules.gamification.tiers import perks_for
from app.modules.notifications.service import notify
from app.modules.social.models import Follow, Post, PostComment, PostLike
from app.modules.users.models import User
from app.modules.users.refs import is_staff, owner_ref_dict

router = APIRouter(tags=["social"])

VISIBILITY = frozenset({"public", "private"})

IMG = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
HASHTAG_RE = re.compile(r"#(\w+)", re.UNICODE)


def _owner(u):
    return owner_ref_dict(u)


async def _user_by_name(db, username):
    u = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not u:
        raise ApiError(404, "not_found", "Akun tidak ditemukan")
    return u


def _post(p, liked=False):
    d = {
        "id": p.id,
        "author": _owner(p.author),
        "body_md": p.body_md,
        "images": p.images,
        "like_count": p.like_count,
        "comment_count": p.comment_count,
        "visibility": getattr(p, "visibility", None) or "public",
        "created_at": p.created_at,
        "liked": liked,
        "asset": None,
    }
    if p.asset_kind and p.asset_slug:
        d["asset"] = {"kind": p.asset_kind, "slug": p.asset_slug}
    return d


async def _liked_ids(db, user, post_ids):
    if not user or not post_ids:
        return set()
    rows = (
        await db.execute(
            select(PostLike.post_id).where(PostLike.user_id == user.id, PostLike.post_id.in_(post_ids))
        )
    ).scalars().all()
    return set(rows)


def _visible_posts_filter(viewer):
    if viewer:
        return or_(Post.visibility == "public", Post.author_id == viewer.id)
    return Post.visibility == "public"


async def _get_owned_post(db, post_id: str, user: User) -> Post:
    p = (
        await db.execute(select(Post).options(selectinload(Post.author)).where(Post.id == post_id))
    ).scalar_one_or_none()
    if not p:
        raise ApiError(404, "not_found", "Postingan tidak ditemukan")
    if p.author_id != user.id:
        raise ApiError(403, "forbidden", "Hanya pemilik yang dapat mengubah postingan")
    return p


async def _get_viewable_post(db, post_id: str, viewer) -> Post:
    p = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not p:
        raise ApiError(404, "not_found", "Postingan tidak ditemukan")
    vis = getattr(p, "visibility", None) or "public"
    if vis == "private" and (not viewer or viewer.id != p.author_id):
        raise ApiError(404, "not_found", "Postingan tidak ditemukan")
    return p


async def _resolve_comment_parent(db, post_id: str, parent_id: str | None) -> tuple[str | None, str | None]:
    """Max depth 2: replies attach to top-level comment; reply-to-reply mentions author."""
    if not parent_id:
        return None, None
    parent = (
        await db.execute(
            select(PostComment).where(PostComment.id == parent_id, PostComment.post_id == post_id)
        )
    ).scalar_one_or_none()
    if not parent:
        raise ApiError(404, "not_found", "Komentar induk tidak ditemukan")
    if parent.parent_id:
        return parent.parent_id, parent.author_id
    return parent_id, None


def _comment_dict(c):
    d = {
        "id": c.id,
        "author": _owner(c.author),
        "body_md": c.body_md,
        "parent_id": c.parent_id,
        "created_at": c.created_at,
    }
    if getattr(c, "reply_to_author", None):
        d["reply_to"] = _owner(c.reply_to_author)
    return d


@router.get("/feed/stats")
async def feed_stats(
    viewer=Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    total_posts = (await db.execute(select(func.count()).select_from(Post))).scalar_one()
    total_likes = (
        await db.execute(select(func.coalesce(func.sum(Post.like_count), 0)))
    ).scalar_one()
    active_this_week = (
        await db.execute(select(func.count()).select_from(Post).where(Post.created_at >= week_ago))
    ).scalar_one()

    bodies = (await db.execute(select(Post.body_md))).scalars().all()
    tag_counts: dict[str, int] = {}
    for body in bodies:
        for tag in HASHTAG_RE.findall(body or ""):
            key = tag.lower()
            tag_counts[key] = tag_counts.get(key, 0) + 1
    trending_tags = sorted(tag_counts.items(), key=lambda x: -x[1])[:8]

    hot_rows = (
        await db.execute(
            select(Post)
            .options(selectinload(Post.author))
            .where(_visible_posts_filter(viewer))
            .order_by(Post.like_count.desc(), Post.created_at.desc())
            .limit(5)
        )
    ).scalars().all()
    hot_posts = [
        {
            "id": p.id,
            "author": _owner(p.author),
            "preview": (p.body_md or "")[:140],
            "like_count": p.like_count,
            "comment_count": p.comment_count,
            "created_at": p.created_at,
        }
        for p in hot_rows
    ]

    activity: dict[str, int] = defaultdict(int)
    for aid in (await db.execute(select(Post.author_id).where(Post.created_at >= week_ago))).scalars():
        activity[aid] += 2
    for aid in (
        await db.execute(
            select(PostComment.author_id).where(PostComment.created_at >= week_ago)
        )
    ).scalars():
        activity[aid] += 1

    people_of_week = []
    for aid in sorted(activity.keys(), key=lambda k: activity[k], reverse=True)[:5]:
        u = (await db.execute(select(User).where(User.id == aid))).scalar_one_or_none()
        if u:
            people_of_week.append({"user": _owner(u), "score": activity[aid]})

    suggested_follows = []
    if viewer:
        following_sub = select(Follow.following_id).where(Follow.follower_id == viewer.id)
        rows = (
            await db.execute(
                select(User, func.count(Follow.follower_id).label("fc"))
                .join(Follow, Follow.following_id == User.id)
                .where(User.id != viewer.id, User.id.not_in(following_sub))
                .group_by(User.id)
                .order_by(func.count(Follow.follower_id).desc())
                .limit(5)
            )
        ).all()
        suggested_follows = [{"user": _owner(u), "followers": fc} for u, fc in rows]

    return {
        "total_posts": total_posts,
        "total_likes": int(total_likes or 0),
        "active_this_week": active_this_week,
        "trending_tags": [{"tag": t, "count": c} for t, c in trending_tags],
        "hot_posts": hot_posts,
        "people_of_week": people_of_week,
        "suggested_follows": suggested_follows,
    }


@router.post("/users/{username}/follow", status_code=201)
async def follow(username: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    target = await _user_by_name(db, username)
    if target.id == user.id:
        raise ApiError(400, "self", "Tidak bisa mengikuti diri sendiri")
    if not (
        await db.execute(
            select(Follow).where(Follow.follower_id == user.id, Follow.following_id == target.id)
        )
    ).scalar_one_or_none():
        db.add(Follow(follower_id=user.id, following_id=target.id))
        target.follower_count = (target.follower_count or 0) + 1
        await db.commit()
        await after_follow(db, target)
        await notify(
            db,
            target.id,
            "follow",
            f"{user.username} mulai mengikuti Anda",
            link=f"/{user.username}",
            actor_id=user.id,
        )
    return {"following": True}


@router.delete("/users/{username}/follow")
async def unfollow(username: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    target = await _user_by_name(db, username)
    f = (
        await db.execute(
            select(Follow).where(Follow.follower_id == user.id, Follow.following_id == target.id)
        )
    ).scalar_one_or_none()
    if f:
        await db.delete(f)
        target.follower_count = max(0, (target.follower_count or 0) - 1)
        await db.commit()
    return {"following": False}


@router.delete("/users/{username}/followers/{follower_username}")
async def remove_follower(
    username: str,
    follower_username: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _user_by_name(db, username)
    if target.id != user.id:
        raise ApiError(403, "forbidden", "Hanya pemilik profil yang dapat menghapus pengikut")
    follower = await _user_by_name(db, follower_username)
    f = (
        await db.execute(
            select(Follow).where(Follow.follower_id == follower.id, Follow.following_id == target.id)
        )
    ).scalar_one_or_none()
    if f:
        await db.delete(f)
        target.follower_count = max(0, (target.follower_count or 0) - 1)
        await db.commit()
    return {"removed": True}


@router.get("/users/{username}/followers")
async def followers(username: str, p: PageParams = Depends(page_params), db: AsyncSession = Depends(get_db)):
    t = await _user_by_name(db, username)
    stmt = select(User).join(Follow, Follow.follower_id == User.id).where(Follow.following_id == t.id)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_owner(u) for u in rows], total, p)


@router.get("/users/{username}/following")
async def following(username: str, p: PageParams = Depends(page_params), db: AsyncSession = Depends(get_db)):
    t = await _user_by_name(db, username)
    stmt = select(User).join(Follow, Follow.following_id == User.id).where(Follow.follower_id == t.id)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_owner(u) for u in rows], total, p)


@router.post("/posts/images")
async def upload_post_image(
    file: UploadFile = File(...), user=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    ext = IMG.get(file.content_type)
    if not ext:
        raise ApiError(422, "invalid_file", "Format jpg/png/webp")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise ApiError(413, "too_large", "Maks 5 MB")
    url = upload_public(f"posts/{user.id}/{uuid.uuid4().hex}.{ext}", data, file.content_type)
    return {"url": url}


@router.post("/posts", status_code=201, dependencies=[rate_limit("post", 20, 60)])
async def create_post(body: dict, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    perks = perks_for(user.reputation or 0)
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today = (
        await db.execute(
            select(func.count()).select_from(Post).where(Post.author_id == user.id, Post.created_at >= start)
        )
    ).scalar_one()
    if today >= perks["daily_post_limit"]:
        raise ApiError(429, "limit_reached", "Batas postingan harian tercapai")
    images = body.get("images", [])
    if len(images) > perks["post_image_max"]:
        raise ApiError(422, "too_many_images", f"Maksimal {perks['post_image_max']} gambar")
    p = Post(
        author_id=user.id,
        body_md=body.get("body_md", ""),
        images=images,
        asset_kind=(body.get("asset") or {}).get("kind"),
        asset_slug=(body.get("asset") or {}).get("slug"),
        visibility=body.get("visibility", "public")
        if body.get("visibility", "public") in VISIBILITY
        else "public",
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    p.author = user
    return _post(p)


@router.get("/feed")
async def feed(
    scope: str = "following",
    user=Depends(get_current_user_optional),
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    if scope == "following" and not user:
        raise ApiError(401, "unauthorized", "Belum masuk")
    stmt = select(Post).options(selectinload(Post.author)).where(_visible_posts_filter(user))
    if scope == "following":
        sub = select(Follow.following_id).where(Follow.follower_id == user.id)
        stmt = stmt.where(or_(Post.author_id.in_(sub), Post.author_id == user.id))
    stmt = stmt.order_by(Post.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    liked = await _liked_ids(db, user, [r.id for r in rows])
    return paginated([_post(r, r.id in liked) for r in rows], total, p)


@router.get("/users/{username}/posts")
async def user_posts(
    username: str,
    viewer=Depends(get_current_user_optional),
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    t = await _user_by_name(db, username)
    stmt = (
        select(Post)
        .options(selectinload(Post.author))
        .where(Post.author_id == t.id)
        .order_by(Post.created_at.desc())
    )
    if not viewer or viewer.id != t.id:
        stmt = stmt.where(Post.visibility == "public")
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    liked = await _liked_ids(db, viewer, [r.id for r in rows])
    return paginated([_post(r, r.id in liked) for r in rows], total, p)


@router.patch("/posts/{post_id}")
async def update_post(post_id: str, body: dict, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    p = await _get_owned_post(db, post_id, user)
    if "body_md" in body:
        p.body_md = body["body_md"]
    if "visibility" in body:
        v = body["visibility"]
        if v not in VISIBILITY:
            raise ApiError(422, "invalid_visibility", "Visibilitas harus public atau private")
        p.visibility = v
    if "images" in body:
        images = body["images"]
        perks = perks_for(user.reputation or 0)
        if len(images) > perks["post_image_max"]:
            raise ApiError(422, "too_many_images", f"Maksimal {perks['post_image_max']} gambar")
        p.images = images
    await db.commit()
    await db.refresh(p)
    liked = await _liked_ids(db, user, [p.id])
    return _post(p, p.id in liked)


@router.delete("/posts/{post_id}", status_code=204)
async def delete_post(post_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    p = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if p and (p.author_id == user.id or is_staff(user)):
        await db.delete(p)
        await db.commit()


@router.post("/posts/{post_id}/like")
async def like_post(post_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    p = await _get_viewable_post(db, post_id, user)
    if not (
        await db.execute(
            select(PostLike).where(PostLike.user_id == user.id, PostLike.post_id == post_id)
        )
    ).scalar_one_or_none():
        if p.author_id == user.id:
            return {"liked": True, "like_count": p.like_count}
        db.add(PostLike(user_id=user.id, post_id=post_id))
        p.like_count += 1
        author = (
            await db.execute(select(User).where(User.id == p.author_id))
        ).scalar_one_or_none()
        if author:
            author.post_like_total = (author.post_like_total or 0) + 1
        await db.commit()
        if author:
            await after_post_liked(db, author, p.like_count)
            await notify(
                db,
                p.author_id,
                "post_like",
                "Postingan Anda disukai",
                link="/community",
                actor_id=user.id,
            )
    return {"liked": True, "like_count": p.like_count}


@router.delete("/posts/{post_id}/like")
async def unlike_post(post_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    p = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    f = (
        await db.execute(
            select(PostLike).where(PostLike.user_id == user.id, PostLike.post_id == post_id)
        )
    ).scalar_one_or_none()
    if f:
        await db.delete(f)
        p.like_count = max(0, p.like_count - 1)
        author = (
            await db.execute(select(User).where(User.id == p.author_id))
        ).scalar_one_or_none()
        if author:
            author.post_like_total = max(0, (author.post_like_total or 0) - 1)
        await db.commit()
    return {"liked": False, "like_count": p.like_count if p else 0}


@router.get("/posts/{post_id}/comments")
async def comments(post_id: str, p: PageParams = Depends(page_params), db: AsyncSession = Depends(get_db)):
    stmt = (
        select(PostComment)
        .options(selectinload(PostComment.author), selectinload(PostComment.reply_to_author))
        .where(PostComment.post_id == post_id)
        .order_by(PostComment.created_at.asc())
    )
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_comment_dict(c) for c in rows], total, p)


@router.post("/posts/{post_id}/comments", status_code=201, dependencies=[rate_limit("comment", 30, 60)])
async def add_comment(post_id: str, body: dict, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    p = await _get_viewable_post(db, post_id, user)
    parent_id, reply_to_author_id = await _resolve_comment_parent(db, post_id, body.get("parent_id"))
    c = PostComment(
        post_id=post_id,
        author_id=user.id,
        body_md=body["body_md"],
        parent_id=parent_id,
        reply_to_author_id=reply_to_author_id,
    )
    db.add(c)
    p.comment_count += 1
    await db.commit()
    await db.refresh(c)
    c.author = user
    if reply_to_author_id:
        c.reply_to_author = (
            await db.execute(select(User).where(User.id == reply_to_author_id))
        ).scalar_one_or_none()
    await after_comment(db, user)
    notify_target = reply_to_author_id or p.author_id
    await notify(
        db,
        notify_target,
        "comment",
        "Balasan baru di postingan Anda" if reply_to_author_id else "Komentar baru di postingan Anda",
        body=body.get("body_md", "")[:200],
        link="/community",
        actor_id=user.id,
    )
    return _comment_dict(c)
