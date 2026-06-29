"""Endpoint detail aset (README, files, branch, versi, kontributor)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.errors import ApiError
from app.modules.asset_detail import contributors, filetree, gitea_content, language, modelcard, versioning
from app.modules.categories.service import load_category_refs
from app.modules.repos.models import Repo
from app.modules.repos.router import _from_room_ref
from app.modules.repos.schemas import normalize_files, to_detail
from app.modules.teams.deps import team_ref

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
        await db.execute(
            select(Repo).options(selectinload(Repo.owner)).where(Repo.kind == kind, Repo.slug == slug)
        )
    ).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Aset tidak ditemukan")
    return r


async def _readme_text(r: Repo, detail: dict, ref: str | None) -> str:
    gitea_md = await gitea_content.fetch_readme_text(r, ref)
    if gitea_md is not None:
        return gitea_md
    return detail.get("readme_md") or ""


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
        raw = await _readme_text(r, detail, ref)
        meta, body = modelcard.parse_front_matter(raw)
        return {"meta": meta, "body_md": body, "card": modelcard.card_summary(meta)}

    @router.get(f"/{kind_path}/{{owner}}/{{name}}/tree")
    async def tree(owner: str, name: str, ref: str | None = None, db: AsyncSession = Depends(get_db)):
        r = await _repo(db, kind_path, owner, name)
        detail = await _repo_detail(db, r)
        paths, default_branch = await gitea_content.fetch_tree_paths(r, ref)
        if not paths:
            paths = [f["path"] for f in detail.get("files", []) if f.get("path")]
        if not paths:
            paths = ["README.md"]
        return {"tree": filetree.build_tree(paths), "default_branch": default_branch}

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

        gitea_file = await gitea_content.fetch_file(r, path, ref)
        if gitea_file:
            return gitea_file

        lang = language.detect_language(path)
        if language.is_binary(path):
            url = next((f.get("url") for f in detail.get("files", []) if f.get("path") == path), None)
            return {
                "path": path,
                "language": "binary",
                "is_binary": True,
                "download_url": url,
            }

        files = normalize_files(detail.get("files"))
        match = next((f for f in files if f.get("path") == path), None)
        if path.lower().endswith("readme.md"):
            content = await _readme_text(r, detail, ref)
        elif match and match.get("url"):
            content = f"# {path}\n\nUnduh berkas: {match['url']}"
        else:
            content = f"# {path}\n\n(Konten dari repositori)"
        return {
            "path": path,
            "content": content,
            "language": lang,
            "is_binary": False,
            "download_url": match.get("url") if match else None,
        }

    @router.get(f"/{kind_path}/{{owner}}/{{name}}/branches")
    async def branches(owner: str, name: str, db: AsyncSession = Depends(get_db)):
        r = await _repo(db, kind_path, owner, name)
        rows = await gitea_content.fetch_branches(r)
        if rows is not None:
            return rows
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
        r = await _repo(db, kind_path, owner, name)
        if not versioning.is_valid_branch_name(body.name):
            raise ApiError(422, "invalid_branch", "Nama branch tidak valid.")
        created = await gitea_content.create_branch(r, body.name, body.from_ref)
        if created:
            return created
        return {"name": body.name, "commit_sha": "new000", "is_default": False}

    @router.get(f"/{kind_path}/{{owner}}/{{name}}/versions")
    async def versions(owner: str, name: str, db: AsyncSession = Depends(get_db)):
        r = await _repo(db, kind_path, owner, name)
        rows = await gitea_content.fetch_versions(r)
        if rows is not None:
            return rows
        tags = versioning.sort_versions(["v1.0.0", "v0.9.0"])
        return [{"tag": t, "name": t} for t in tags]

    @router.get(f"/{kind_path}/{{owner}}/{{name}}/contributors")
    async def contribs(owner: str, name: str, db: AsyncSession = Depends(get_db)):
        r = await _repo(db, kind_path, owner, name)
        commit_authors = await gitea_content.fetch_commit_authors(r)
        if not commit_authors and r.owner:
            commit_authors = [{"username": r.owner.username, "commits": 1}]
        team_rows = await gitea_content.team_member_rows(db, r.team_id)
        return contributors.aggregate_contributors(commit_authors, team_rows)


for _k in KIND_MAP:
    _register(_k)
