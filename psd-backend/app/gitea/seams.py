"""Seam integrasi Gitea ↔ model Repo PSD."""
from __future__ import annotations

import re
from typing import Iterator

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings as app_settings
from app.core.storage import get_s3
from app.gitea.settings import settings

_sync_engine = None
_SessionLocal: sessionmaker[Session] | None = None


def _session() -> Session:
    global _sync_engine, _SessionLocal
    if _SessionLocal is None:
        sync_url = app_settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
        _sync_engine = create_engine(sync_url, pool_pre_ping=True)
        _SessionLocal = sessionmaker(bind=_sync_engine, expire_on_commit=False)
    return _SessionLocal()


def normalize_gitea_username(username: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9_\-]", "-", username).strip("-")
    return (s[:40] or "user").lower()


def repo_slug(psd_repo) -> str:
    """Nama repo di Gitea (bagian setelah `/` pada slug PSD)."""
    part = psd_repo.slug.split("/", 1)[-1]
    s = re.sub(r"[^a-zA-Z0-9_\-.\s]", "-", part).strip("-")
    return (s[:100] or "repo").lower()


def owner_username(psd_repo) -> str:
    if settings.NAMESPACE_MODE == "org":
        return settings.ORG
    user = getattr(psd_repo, "owner", None)
    uname = user.username if user else psd_repo.slug.split("/", 1)[0]
    return normalize_gitea_username(uname)


def owner_email(psd_repo) -> str:
    user = getattr(psd_repo, "owner", None)
    if user and user.email:
        return user.email
    owner = owner_username(psd_repo)
    return f"{owner}@{app_settings.PSD_GITEA_EMAIL_DOMAIN}"


def gitea_private(psd_repo) -> bool:
    return getattr(psd_repo, "visibility", "public") != "public"


def save_gitea_link(
    psd_repo,
    *,
    clone_url: str,
    gitea_repo_id: int,
    gitea_owner: str | None = None,
    gitea_name: str | None = None,
    db=None,
) -> None:
    psd_repo.clone_url = clone_url
    psd_repo.gitea_repo_id = gitea_repo_id
    psd_repo.gitea_owner = gitea_owner or owner_username(psd_repo)
    psd_repo.gitea_name = gitea_name or repo_slug(psd_repo)
    if db is not None:
        return
    with _session() as s:
        row = s.get(type(psd_repo), psd_repo.id)
        if row:
            row.clone_url = clone_url
            row.gitea_repo_id = gitea_repo_id
            row.gitea_owner = psd_repo.gitea_owner
            row.gitea_name = psd_repo.gitea_name
            s.commit()


def set_source_of_truth(psd_repo, value: str, db=None) -> None:
    psd_repo.source_of_truth = value
    if db is not None:
        return
    with _session() as s:
        from app.modules.repos.models import Repo

        row = s.get(Repo, psd_repo.id)
        if row:
            row.source_of_truth = value
            s.commit()


def _fetch_entry_bytes(entry: dict, repo_id: str) -> bytes:
    key = entry.get("path_key") or f"repos/{repo_id}/{entry.get('path', 'file')}"
    client = get_s3()
    return client.get_object(Bucket=app_settings.S3_ASSETS_BUCKET, Key=key)["Body"].read()


def get_legacy_files(psd_repo) -> list[dict]:
    out: list[dict] = []
    readme = getattr(psd_repo, "readme_md", "") or ""
    if readme.strip():
        out.append({"path": "README.md", "content": readme})
    for entry in psd_repo.files or []:
        path = entry.get("path")
        if not path or path == "README.md":
            continue
        try:
            content = _fetch_entry_bytes(entry, psd_repo.id)
        except Exception:
            url = entry.get("url") or ""
            if not url:
                continue
            import httpx

            content = httpx.get(url, timeout=30).content
        out.append({"path": path, "content": content})
    return out


def iter_legacy_repos() -> Iterator:
    from app.modules.repos.models import Repo

    with _session() as s:
        rows = s.execute(
            select(Repo).where(Repo.gitea_repo_id.is_(None)).order_by(Repo.updated_at)
        ).scalars().all()
        for row in rows:
            s.expunge(row)
            yield row
