from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.core.schemas import OwnerRef
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


def to_summary(r, category=None, subcategory=None, team=None) -> dict:
    return {
        "id": r.id,
        "slug": r.slug,
        "kind": r.kind,
        "name": r.name,
        "description": r.description,
        "tags": r.tags,
        "likes": r.likes,
        "downloads": r.downloads,
        "visibility": r.visibility,
        "featured": bool(getattr(r, "featured", False)),
        "updated_at": r.updated_at,
        "owner": owner_ref(r.owner),
        "category": category,
        "subcategory": subcategory,
        "team": team,
        "synthetic": bool(getattr(r, "synthetic", False)),
        "generation_spec": getattr(r, "generation_spec", None),
    }


def to_detail(r, category=None, subcategory=None, team=None, from_room=None) -> dict:
    return {
        **to_summary(r, category, subcategory, team),
        "readme_md": r.readme_md,
        "files": r.files,
        "license": r.license,
        "metrics": r.metrics,
        "from_room": from_room,
    }
