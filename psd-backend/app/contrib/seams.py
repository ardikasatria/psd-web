"""Seam notifikasi & identitas Gitea ↔ PSD (Langkah 51)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.gitea.seams import normalize_gitea_username
from app.modules.notifications.service import notify
from app.modules.repos.models import Repo
from app.modules.users.models import User


async def notify_user(
    db: AsyncSession,
    user_id: str | None,
    kind: str,
    payload: dict,
    *,
    actor_id: str | None = None,
) -> None:
    if not user_id:
        return
    repo = payload.get("repo", "")
    idx = payload.get("index", "")
    titles = {
        "pr_opened": (f"PR baru #{idx}", payload.get("title", "")),
        "pr_reviewed": (f"Review PR #{idx}", f"{payload.get('event', '')} · {repo}"),
        "pr_merged": (f"PR #{idx} merged", repo),
        "pr_commented": (f"Komentar PR #{idx}", repo),
    }
    title, body = titles.get(kind, (kind, repo))
    link = payload.get("link")
    await notify(db, user_id, kind, title, body=body, link=link, actor_id=actor_id)


async def repo_owner_user(db: AsyncSession, base_owner: str, base_repo: str) -> str | None:
    row = (
        await db.execute(
            select(Repo).where(Repo.gitea_owner == base_owner, Repo.gitea_name == base_repo)
        )
    ).scalar_one_or_none()
    return row.owner_id if row else None


async def pull_author_user(db: AsyncSession, pr: dict) -> str | None:
    login = (pr.get("user") or {}).get("login")
    if not login:
        return None
    rows = (await db.execute(select(User))).scalars().all()
    for u in rows:
        if normalize_gitea_username(u.username) == login.lower():
            return u.id
    row = (await db.execute(select(User).where(User.username == login))).scalar_one_or_none()
    return row.id if row else None


async def contributor_namespace(db: AsyncSession, contributor_user_id: str) -> str:
    user = (
        await db.execute(select(User).where(User.id == contributor_user_id))
    ).scalar_one()
    return normalize_gitea_username(user.username)
