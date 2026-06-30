"""Pencarian konten dalam profil pengguna."""
from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.community.models import Thread
from app.modules.learn.models import Notebook
from app.modules.repos.models import Repo
from app.modules.social.models import Post as SocialPost
from app.modules.users.models import User

_KIND_PATH = {"project": "projects", "dataset": "datasets", "model": "models"}

_KIND_LABEL = {
    "project": "Proyek",
    "dataset": "Dataset",
    "model": "Model",
    "post": "Postingan",
    "thread": "Diskusi",
    "notebook": "Notebook",
}


def _preview(text: str, max_len: int = 140) -> str:
    one_line = " ".join((text or "").split())
    if len(one_line) <= max_len:
        return one_line
    return one_line[: max_len - 1].rstrip() + "…"


def _repo_href(repo: Repo) -> str:
    base = _KIND_PATH.get(repo.kind, "projects")
    if "/" in repo.slug:
        return f"/{base}/{repo.slug}"
    return f"/{base}/{repo.slug}"


def _item(kind: str, id_: str, title: str, preview: str, href: str, created_at) -> dict:
    return {
        "kind": kind,
        "id": id_,
        "title": title,
        "preview": preview,
        "href": href,
        "kind_label": _KIND_LABEL.get(kind, kind),
        "created_at": created_at,
    }


async def search_user_profile(
    db: AsyncSession,
    target: User,
    viewer: User | None,
    q: str,
    *,
    limit: int = 40,
) -> list[dict]:
    term = (q or "").strip()
    if len(term) < 2:
        return []
    pattern = f"%{term}%"
    is_owner = bool(viewer and viewer.id == target.id)
    out: list[dict] = []

    repo_stmt = select(Repo).where(
        Repo.owner_id == target.id,
        or_(
            Repo.name.ilike(pattern),
            Repo.description.ilike(pattern),
            Repo.slug.ilike(pattern),
            Repo.readme_md.ilike(pattern),
        ),
    )
    if not is_owner:
        repo_stmt = repo_stmt.where(Repo.visibility == "public")
    repos = (await db.execute(repo_stmt.order_by(Repo.updated_at.desc()).limit(limit))).scalars().all()
    for repo in repos:
        out.append(
            _item(
                repo.kind,
                repo.id,
                repo.name,
                _preview(repo.description or repo.readme_md),
                _repo_href(repo),
                repo.updated_at,
            )
        )

    post_stmt = (
        select(SocialPost)
        .where(SocialPost.author_id == target.id, SocialPost.body_md.ilike(pattern))
        .order_by(SocialPost.created_at.desc())
        .limit(limit)
    )
    if not is_owner:
        post_stmt = post_stmt.where(SocialPost.visibility == "public")
    posts = (await db.execute(post_stmt)).scalars().all()
    for post in posts:
        out.append(
            _item(
                "post",
                post.id,
                _preview(post.body_md, 80),
                _preview(post.body_md),
                f"/{target.username}?tab=posts",
                post.created_at,
            )
        )

    thread_stmt = (
        select(Thread)
        .where(
            Thread.author_id == target.id,
            or_(Thread.title.ilike(pattern), Thread.body_md.ilike(pattern)),
        )
        .order_by(Thread.created_at.desc())
        .limit(limit)
    )
    if not is_owner:
        thread_stmt = thread_stmt.where(Thread.visibility == "public")
    threads = (await db.execute(thread_stmt)).scalars().all()
    for thread in threads:
        out.append(
            _item(
                "thread",
                thread.id,
                thread.title,
                _preview(thread.body_md),
                f"/forum/{thread.id}",
                thread.created_at,
            )
        )

    nb_stmt = (
        select(Notebook)
        .where(
            Notebook.owner_id == target.id,
            or_(Notebook.title.ilike(pattern), Notebook.description.ilike(pattern)),
        )
        .order_by(Notebook.created_at.desc())
        .limit(limit)
    )
    notebooks = (await db.execute(nb_stmt)).scalars().all()
    for nb in notebooks:
        out.append(
            _item(
                "notebook",
                nb.id,
                nb.title,
                _preview(nb.description),
                f"/notebooks/{nb.id}",
                nb.created_at,
            )
        )

    out.sort(key=lambda x: x["created_at"], reverse=True)
    return out[:limit]
