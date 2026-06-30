"""Integrasi laporan konten dengan modul sosial/forum."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.modules.community.models import Post as ForumPost
from app.modules.community.models import Thread
from app.modules.social.models import Post, PostComment
from app.modules.users.models import User


async def resolve_target(db: AsyncSession, kind: str, target_id: str) -> dict | None:
    """Cuplikan konten untuk antrian moderasi."""
    if kind in ("post", "feed"):
        p = (await db.execute(select(Post).where(Post.id == target_id))).scalar_one_or_none()
        if not p:
            return None
        return {
            "kind": kind,
            "target_id": target_id,
            "preview": (p.body_md or "")[:280],
            "author_id": p.author_id,
        }
    if kind == "comment":
        c = (await db.execute(select(PostComment).where(PostComment.id == target_id))).scalar_one_or_none()
        if not c:
            return None
        return {
            "kind": kind,
            "target_id": target_id,
            "preview": (c.body_md or "")[:280],
            "author_id": c.author_id,
        }
    if kind == "thread":
        t = (await db.execute(select(Thread).where(Thread.id == target_id))).scalar_one_or_none()
        if not t:
            return None
        return {
            "kind": kind,
            "target_id": target_id,
            "preview": f"{t.title}\n{(t.body_md or '')[:200]}",
            "author_id": t.author_id,
        }
    if kind == "reply":
        p = (await db.execute(select(ForumPost).where(ForumPost.id == target_id))).scalar_one_or_none()
        if not p:
            return None
        return {
            "kind": kind,
            "target_id": target_id,
            "preview": (p.body_md or "")[:280],
            "author_id": p.author_id,
        }
    return None


async def assert_reportable_target(db: AsyncSession, kind: str, target_id: str, reporter: User) -> dict:
    info = await resolve_target(db, kind, target_id)
    if not info:
        raise ApiError(404, "not_found", "Konten tidak ditemukan")
    if info["author_id"] == reporter.id:
        raise ApiError(422, "self_report", "Tidak bisa melaporkan konten sendiri")
    return info


async def apply_moderation_effect(
    db: AsyncSession, kind: str, target_id: str, decision: str, moderator_id: str
) -> None:
    if decision == "dismiss":
        return

    author_id: str | None = None

    if decision == "remove":
        if kind in ("post", "feed"):
            p = (await db.execute(select(Post).where(Post.id == target_id))).scalar_one_or_none()
            if p:
                author_id = p.author_id
                await db.delete(p)
        elif kind == "comment":
            c = (await db.execute(select(PostComment).where(PostComment.id == target_id))).scalar_one_or_none()
            if c:
                author_id = c.author_id
                post = (await db.execute(select(Post).where(Post.id == c.post_id))).scalar_one_or_none()
                if post:
                    post.comment_count = max(0, (post.comment_count or 0) - 1)
                await db.delete(c)
        elif kind == "thread":
            t = (await db.execute(select(Thread).where(Thread.id == target_id))).scalar_one_or_none()
            if t:
                author_id = t.author_id
                replies = (
                    await db.execute(select(ForumPost).where(ForumPost.thread_id == t.id))
                ).scalars().all()
                for r in replies:
                    await db.delete(r)
                await db.delete(t)
        elif kind == "reply":
            p = (await db.execute(select(ForumPost).where(ForumPost.id == target_id))).scalar_one_or_none()
            if p:
                author_id = p.author_id
                await db.delete(p)
    elif decision == "lock" and kind == "thread":
        t = (await db.execute(select(Thread).where(Thread.id == target_id))).scalar_one_or_none()
        if t:
            t.visibility = "private"
            author_id = t.author_id
    elif decision in ("warn", "ban"):
        info = await resolve_target(db, kind, target_id)
        author_id = info["author_id"] if info else None
        if decision == "ban" and author_id:
            u = (await db.execute(select(User).where(User.id == author_id))).scalar_one_or_none()
            if u:
                u.is_active = False

    if author_id and decision in ("warn", "ban", "remove"):
        from app.modules.notifications.service import notify

        titles = {
            "warn": "Peringatan moderasi",
            "ban": "Akun ditangguhkan",
            "remove": "Konten Anda dihapus",
        }
        await notify(
            db,
            author_id,
            "moderation",
            titles.get(decision, "Moderasi"),
            body=f"Keputusan moderator: {decision}",
            link="/support",
            actor_id=moderator_id,
        )
