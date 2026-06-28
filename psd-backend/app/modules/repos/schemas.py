from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.core.schemas import OwnerRef
from app.core.config import settings
from app.modules.users.refs import owner_ref_dict


class RepoSummary(BaseModel):
    id: str
    slug: str
    kind: Literal["project", "dataset", "model"]
    owner: OwnerRef
    name: str
    description: str
    tags: list[str]
    likes: int
    downloads: int
    visibility: Literal["public", "private"]
    featured: bool = False
    updated_at: datetime
    category: dict | None = None
    subcategory: dict | None = None
    team: dict | None = None
    synthetic: bool = False
    generation_spec: dict | None = None


class FileEntry(BaseModel):
    path: str
    size_bytes: int
    type: str
    url: str | None = None


class RepoUpdate(BaseModel):
    description: str | None = None
    tags: list[str] | None = None
    license: str | None = None
    visibility: Literal["public", "private"] | None = None
    readme_md: str | None = None
    category: str | None = None
    subcategory: str | None = None


class RepoDetail(RepoSummary):
    readme_md: str
    files: list[FileEntry]
    license: str | None = None
    metrics: dict | None = None
    liked: bool = False
    from_room: dict | None = None


def owner_ref(user) -> dict:
    return owner_ref_dict(user)


def normalize_files(files: list | None) -> list[dict]:
    """Pastikan setiap file punyi url publik (dari path_key bila perlu)."""
    out: list[dict] = []
    base = settings.S3_ASSETS_PUBLIC_BASE_URL.rstrip("/")
    for raw in files or []:
        if not isinstance(raw, dict):
            continue
        path = raw.get("path") or ""
        url = raw.get("url")
        if not url:
            key = raw.get("path_key")
            if key:
                url = f"{base}/{str(key).lstrip('/')}"
        out.append(
            {
                "path": path,
                "size_bytes": int(raw.get("size_bytes") or 0),
                "type": raw.get("type") or "application/octet-stream",
                "url": url or "",
            }
        )
    return out


def to_summary(r, category=None, subcategory=None, team=None) -> dict:
    owner = getattr(r, "owner", None)
    return {
        "id": r.id,
        "slug": r.slug,
        "kind": r.kind,
        "name": r.name,
        "description": r.description,
        "tags": r.tags or [],
        "likes": r.likes,
        "downloads": r.downloads,
        "visibility": r.visibility,
        "featured": bool(getattr(r, "featured", False)),
        "updated_at": r.updated_at,
        "owner": owner_ref(owner) if owner else {"username": "unknown", "type": "user", "avatar_url": None},
        "category": category,
        "subcategory": subcategory,
        "team": team,
        "synthetic": bool(getattr(r, "synthetic", False)),
        "generation_spec": getattr(r, "generation_spec", None),
        "clone_url": getattr(r, "clone_url", None),
        "source_of_truth": getattr(r, "source_of_truth", "psd"),
    }


def to_detail(r, category=None, subcategory=None, team=None, from_room=None) -> dict:
    return {
        **to_summary(r, category, subcategory, team),
        "readme_md": r.readme_md or "",
        "files": normalize_files(r.files),
        "license": r.license,
        "metrics": r.metrics,
        "from_room": from_room,
    }
