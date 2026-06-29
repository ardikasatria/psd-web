"""Endpoint detail aset (README, files, branch, versi, kontributor)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.errors import ApiError
from app.modules.asset_detail import contributors, filetree, language, modelcard, versioning
from app.modules.repos.models import Repo
from app.modules.repos.schemas import to_detail
from app.modules.categories.service import load_category_refs
from app.modules.repos.router import team_ref, _from_room_ref

router = APIRouter(tags=["asset-detail"])

KIND_MAP = {"projects": "project", "datasets": "dataset", "models": "model"}


class CreateBranchBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=200)
    from_ref: str = Field("main", alias="from")


async def _repo_detail(db: AsyncSession, r: Repo) -> dict:
    cat, sub = await load_category_refs(db, r.category_id, r.subcategory_id)
    tm = await team_ref(db, r.team_id)
    fr = await _from_room_ref(db, getattr(r, "room_id", None))
    return to_detail(r, cat, sub, tm, fr)


async def _repo(db: AsyncSession, kind_path: str, owner: str, name: str) -> Repo:
    kind = KIND_MAP.get(kind_path)
    if not kind:
        raise ApiError(404, "not_found", "Jenis aset tidak dikenal")
    slug = f"{owner}/{name}"
    r = (
        await db.execute(select(Repo).where(Repo.kind == kind, Repo.slug == slug))
    ).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Aset tidak ditemukan")
    return r


def _register(kind_path: str):
    @router.get(f"/{kind_path}/{{owner}}/{{name}}/readme")
    async def readme(
        owner: str,
        name: str,
        ref: str | None = None,
        db: AsyncSession = Depends(get_db),
    ):
        r = await _repo(db, kind_path, owner, name)
        detail = await _repo_detail(db, r)
        raw = detail.get("readme_md") or ""
        meta, body = modelcard.parse_front_matter(raw)
        return {"meta": meta, "body_md": body, "card": modelcard.card_summary(meta)}

    @router.get(f"/{kind_path}/{{owner}}/{{name}}/tree")
    async def tree(owner: str, name: str, ref: str | None = None, db: AsyncSession = Depends(get_db)):
        r = await _repo(db, kind_path, owner, name)
        detail = await _repo_detail(db, r)
        paths = [f["path"] for f in detail.get("files", [])]
        if not paths:
            paths = ["README.md"]
        return {"tree": filetree.build_tree(paths), "default_branch": "main"}

    @router.get(f"/{kind_path}/{{owner}}/{{name}}/file")
    async def file(
        owner: str,
        name: str,
        path: str = Query(...),
        ref: str | None = None,
        db: AsyncSession = Depends(get_db),
    ):
        r = await _repo(db, kind_path, owner, name)
        detail = await _repo_detail(db, r)
        lang = language.detect_language(path)
        if language.is_binary(path):
            url = next((f.get("url") for f in detail.get("files", []) if f.get("path") == path), None)
            return {
                "path": path,
                "language": "binary",
                "is_binary": True,
                "download_url": url,
            }
        content = detail.get("readme_md", "") if path.lower().endswith("readme.md") else f"# {path}\n\n(Konten dari repositori)"
        return {
            "path": path,
            "content": content,
            "language": lang,
            "is_binary": False,
            "download_url": next((f.get("url") for f in detail.get("files", []) if f.get("path") == path), None),
        }

    @router.get(f"/{kind_path}/{{owner}}/{{name}}/branches")
    async def branches(owner: str, name: str, db: AsyncSession = Depends(get_db)):
        await _repo(db, kind_path, owner, name)
        return [
            {"name": "main", "commit_sha": "0000000", "is_default": True},
            {"name": "dev", "commit_sha": "0000001"},
        ]

    @router.post(f"/{kind_path}/{{owner}}/{{name}}/branches")
    async def create_branch(
        owner: str,
        name: str,
        body: CreateBranchBody,
        db: AsyncSession = Depends(get_db),
    ):
        await _repo(db, kind_path, owner, name)
        if not versioning.is_valid_branch_name(body.name):
            raise ApiError(422, "invalid_branch", "Nama branch tidak valid.")
        return {"name": body.name, "commit_sha": "new000", "is_default": False}

    @router.get(f"/{kind_path}/{{owner}}/{{name}}/versions")
    async def versions(owner: str, name: str, db: AsyncSession = Depends(get_db)):
        await _repo(db, kind_path, owner, name)
        tags = versioning.sort_versions(["v1.0.0", "v0.9.0"])
        return [{"tag": t, "name": t} for t in tags]

    @router.get(f"/{kind_path}/{{owner}}/{{name}}/contributors")
    async def contribs(owner: str, name: str, db: AsyncSession = Depends(get_db)):
        r = await _repo(db, kind_path, owner, name)
        await db.refresh(r, ["owner"])
        commit_authors = [{"username": r.owner.username if r.owner else owner, "commits": 1}]
        return contributors.aggregate_contributors(commit_authors, [])


for _k in KIND_MAP:
    _register(_k)
