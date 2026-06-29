"""Resolve asset_key ke detail ringkas untuk daftar suka."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.engagement.models import AssetEngagement
from app.modules.engagement.service import REPO_KINDS, asset_key as make_key
from app.modules.learn.models import Notebook
from app.modules.liked.visibility import asset_kind, asset_slug
from app.modules.repos.models import Repo
from app.modules.users.refs import owner_ref_dict


def asset_href(kind: str, slug: str) -> str:
    if kind == "notebook":
        return f"/notebooks/{slug}"
    if kind in REPO_KINDS:
        parts = slug.split("/", 1)
        if len(parts) == 2:
            owner, name = parts
            plural = "projects" if kind == "project" else f"{kind}s"
            return f"/{plural}/{owner}/{name}"
    return f"/explore"


async def enrich_liked_asset(db: AsyncSession, item) -> dict | None:
    kind = asset_kind(item.asset_key)
    slug = asset_slug(item.asset_key)
    stats = {"love_count": 0, "download_count": 0}
    key = make_key(kind, slug)

    eng = (await db.execute(select(AssetEngagement).where(AssetEngagement.asset_key == key))).scalar_one_or_none()
    if eng:
        stats = {"love_count": eng.love_count or 0, "download_count": eng.download_count or 0}

    if kind in REPO_KINDS:
        repo = (
            await db.execute(
                select(Repo).options(selectinload(Repo.owner)).where(Repo.kind == kind, Repo.slug == slug)
            )
        ).scalar_one_or_none()
        if not repo:
            return None
        if not eng:
            stats = {"love_count": repo.likes or 0, "download_count": repo.downloads or 0}
        return {
            "kind": kind,
            "slug": slug,
            "title": repo.title or repo.name,
            "owner": owner_ref_dict(repo.owner),
            "stats": stats,
            "href": asset_href(kind, slug),
            "is_public": item.is_public,
            "liked_at": item.liked_at,
        }

    if kind == "notebook":
        nb = (
            await db.execute(select(Notebook).options(selectinload(Notebook.owner)).where(Notebook.id == slug))
        ).scalar_one_or_none()
        if not nb:
            return None
        return {
            "kind": kind,
            "slug": slug,
            "title": nb.title,
            "owner": owner_ref_dict(nb.owner),
            "stats": stats,
            "href": asset_href(kind, slug),
            "is_public": item.is_public,
            "liked_at": item.liked_at,
        }

    return None
