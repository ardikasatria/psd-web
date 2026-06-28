"""Router kontribusi PR (Langkah 51)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contrib import contrib, pr_view
from app.contrib.client import GiteaError
from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.gitea import seams as gitea_seams
from app.gitea.service import client_or_none
from app.modules.repos.models import Repo
from app.modules.repos.router import _can_edit_repo, _get_repo
from app.modules.users.models import User

router = APIRouter(tags=["contrib"])


def _require_gitea():
    client = client_or_none()
    if not client:
        raise ApiError(503, "gitea_unavailable", "Integrasi Gitea tidak aktif")
    return client


def _coords(r: Repo) -> tuple[str, str]:
    if not r.gitea_repo_id:
        raise ApiError(400, "not_linked", "Repo belum terhubung ke Gitea")
    owner = r.gitea_owner or gitea_seams.owner_username(r)
    name = r.gitea_name or gitea_seams.repo_slug(r)
    return owner, name


@router.get("/repos/{repo_id}/pulls")
async def list_repo_pulls(
    repo_id: str,
    state: str = "open",
    db: AsyncSession = Depends(get_db),
):
    r = await _get_repo(db, repo_id)
    owner, name = _coords(r)
    client = _require_gitea()
    async with client:
        items = await pr_view.list_pulls(client, owner, name, state=state)
    return {"items": items}


@router.get("/repos/{repo_id}/pulls/{index}")
async def get_repo_pull(
    repo_id: str,
    index: int,
    db: AsyncSession = Depends(get_db),
):
    r = await _get_repo(db, repo_id)
    owner, name = _coords(r)
    client = _require_gitea()
    async with client:
        detail = await pr_view.pull_detail(client, owner, name, index)
    return detail


@router.post("/repos/{repo_id}/pulls", status_code=201)
async def create_repo_pull(
    repo_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await _get_repo(db, repo_id)
    owner, name = _coords(r)
    title = (body.get("title") or "").strip()
    work_branch = (body.get("work_branch") or "").strip()
    if not title or not work_branch:
        raise ApiError(422, "invalid", "title dan work_branch wajib")
    client = _require_gitea()
    async with client:
        try:
            pr = await contrib.open_contribution(
                client,
                db,
                owner,
                name,
                contributor=user,
                title=title,
                work_branch=work_branch,
                base_branch=body.get("base_branch") or settings.PSD_PR_DEFAULT_BRANCH,
                body=body.get("body") or "",
                files=body.get("files"),
                repo_id=r.id,
            )
        except GiteaError as e:
            raise ApiError(502, "gitea_error", str(e)) from e
    return {"number": pr["number"], "title": pr.get("title"), "state": pr.get("state")}


@router.post("/repos/{repo_id}/pulls/{index}/review")
async def review_repo_pull(
    repo_id: str,
    index: int,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await _get_repo(db, repo_id)
    await _can_edit_repo(db, r.id, user)
    owner, name = _coords(r)
    event = (body.get("event") or "COMMENT").upper()
    if event not in ("APPROVE", "REQUEST_CHANGES", "COMMENT"):
        raise ApiError(422, "invalid", "event harus APPROVE, REQUEST_CHANGES, atau COMMENT")
    client = _require_gitea()
    async with client:
        try:
            review = await contrib.submit_review(
                client,
                db,
                owner,
                name,
                index,
                event=event,
                body=body.get("body") or "",
                actor_id=user.id,
                repo_id=r.id,
            )
        except GiteaError as e:
            raise ApiError(502, "gitea_error", str(e)) from e
    return review


@router.post("/repos/{repo_id}/pulls/{index}/merge")
async def merge_repo_pull(
    repo_id: str,
    index: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await _can_edit_repo(db, repo_id, user)
    owner, name = _coords(r)
    client = _require_gitea()
    async with client:
        try:
            ok = await contrib.merge_contribution(
                client, db, owner, name, index, repo_id=r.id
            )
        except GiteaError as e:
            raise ApiError(409 if e.status == 409 else 502, "gitea_error", str(e)) from e
    return {"merged": ok}


@router.post("/repos/{repo_id}/pulls/{index}/comments", status_code=201)
async def comment_repo_pull(
    repo_id: str,
    index: int,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await _get_repo(db, repo_id)
    text = (body.get("body") or "").strip()
    if not text:
        raise ApiError(422, "invalid", "body wajib")
    owner, name = _coords(r)
    client = _require_gitea()
    async with client:
        try:
            c = await contrib.comment(
                client,
                db,
                owner,
                name,
                index,
                body=text,
                actor_id=user.id,
                repo_id=r.id,
            )
        except GiteaError as e:
            raise ApiError(502, "gitea_error", str(e)) from e
    return c
