"""Orkestrasi alur kontribusi PR (Langkah 51)."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.contrib import seams
from app.contrib.client import GiteaError, GiteaPRClient, make_operations
from app.core.config import settings
from app.modules.users.models import User


async def _ensure_fork(
    client: GiteaPRClient, base_owner: str, base_repo: str, fork_owner: str
) -> dict:
    try:
        return await client.fork(base_owner, base_repo)
    except GiteaError as e:
        if e.status in (409, 422):
            return await client.get_repo(fork_owner, base_repo)
        raise


async def _ensure_branch(
    client: GiteaPRClient, owner: str, repo: str, work_branch: str, base_branch: str
) -> None:
    try:
        await client.create_branch(owner, repo, new=work_branch, old=base_branch)
    except GiteaError as e:
        if e.status not in (409, 422):
            raise


async def open_contribution(
    client: GiteaPRClient,
    db: AsyncSession,
    base_owner: str,
    base_repo: str,
    *,
    contributor: User,
    title: str,
    work_branch: str,
    base_branch: str | None = None,
    body: str = "",
    files: list[dict] | None = None,
    repo_id: str | None = None,
) -> dict:
    base_branch = base_branch or settings.PSD_PR_DEFAULT_BRANCH
    fork_owner = await seams.contributor_namespace(db, contributor.id)
    await client.ensure_user(
        username=fork_owner,
        email=contributor.email,
        full_name=contributor.name,
    )
    await _ensure_fork(client, base_owner, base_repo, fork_owner)
    await _ensure_branch(client, fork_owner, base_repo, work_branch, base_branch)

    if files:
        await client.change_files(
            fork_owner,
            base_repo,
            message=title,
            files=make_operations(files, "create"),
            branch=work_branch,
        )

    pr = await client.create_pull(
        base_owner,
        base_repo,
        title=title,
        body=body,
        head=f"{fork_owner}:{work_branch}",
        base=base_branch,
    )
    owner_id = await seams.repo_owner_user(db, base_owner, base_repo)
    link = f"/repos/{repo_id}/pulls/{pr['number']}" if repo_id else None
    await seams.notify_user(
        db,
        owner_id,
        "pr_opened",
        {"index": pr["number"], "title": title, "repo": f"{base_owner}/{base_repo}", "link": link},
        actor_id=contributor.id,
    )
    return pr


async def submit_review(
    client: GiteaPRClient,
    db: AsyncSession,
    owner: str,
    repo: str,
    index: int,
    *,
    event: str,
    body: str = "",
    actor_id: str | None = None,
    repo_id: str | None = None,
) -> dict:
    review = await client.create_review(owner, repo, index, event=event, body=body)
    pr = await client.get_pull(owner, repo, index)
    author_id = await seams.pull_author_user(db, pr)
    link = f"/repos/{repo_id}/pulls/{index}" if repo_id else None
    await seams.notify_user(
        db,
        author_id,
        "pr_reviewed",
        {"index": index, "event": event, "repo": f"{owner}/{repo}", "link": link},
        actor_id=actor_id,
    )
    return review


async def merge_contribution(
    client: GiteaPRClient,
    db: AsyncSession,
    owner: str,
    repo: str,
    index: int,
    *,
    method: str | None = None,
    delete_branch: bool | None = None,
    repo_id: str | None = None,
) -> bool:
    pr = await client.get_pull(owner, repo, index)
    if pr.get("merged"):
        return True
    if pr.get("mergeable") is False:
        raise GiteaError(409, "PR belum bisa di-merge (konflik atau cek gagal).")
    reviews = await client.list_reviews(owner, repo, index)
    for r in reviews:
        st = (r.get("state") or "").upper()
        if st in ("REQUEST_CHANGES", "CHANGES_REQUESTED"):
            raise GiteaError(409, "Masih ada permintaan perubahan yang belum teratasi.")
    ok = await client.merge_pull(
        owner,
        repo,
        index,
        method=method or settings.PSD_PR_MERGE_METHOD,
        delete_branch=(
            settings.PSD_PR_DELETE_BRANCH if delete_branch is None else delete_branch
        ),
    )
    if ok:
        author_id = await seams.pull_author_user(db, pr)
        link = f"/repos/{repo_id}/pulls/{index}" if repo_id else None
        await seams.notify_user(
            db,
            author_id,
            "pr_merged",
            {"index": index, "repo": f"{owner}/{repo}", "link": link},
        )
    return ok


async def comment(
    client: GiteaPRClient,
    db: AsyncSession,
    owner: str,
    repo: str,
    index: int,
    *,
    body: str,
    actor_id: str | None = None,
    repo_id: str | None = None,
) -> dict:
    c = await client.create_comment(owner, repo, index, body=body)
    pr = await client.get_pull(owner, repo, index)
    author_id = await seams.pull_author_user(db, pr)
    link = f"/repos/{repo_id}/pulls/{index}" if repo_id else None
    await seams.notify_user(
        db,
        author_id,
        "pr_commented",
        {"index": index, "repo": f"{owner}/{repo}", "body": body, "link": link},
        actor_id=actor_id,
    )
    return c
