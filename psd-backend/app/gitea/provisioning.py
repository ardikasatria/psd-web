"""Provisioning & dual-write ke Gitea."""
from __future__ import annotations

from app.gitea import seams
from app.gitea.client import GiteaClient, GiteaError, b64, make_operations
from app.gitea.settings import settings


async def ensure_owner(client: GiteaClient, psd_repo) -> str:
    if settings.NAMESPACE_MODE == "org":
        return settings.ORG
    owner = seams.owner_username(psd_repo)
    await client.ensure_user(
        username=owner,
        email=seams.owner_email(psd_repo),
        full_name=getattr(getattr(psd_repo, "owner", None), "name", "") or owner,
    )
    return owner


async def provision_repo(
    client: GiteaClient, psd_repo, *, private: bool | None = None, db=None
) -> dict:
    if psd_repo.gitea_repo_id and psd_repo.clone_url:
        owner = psd_repo.gitea_owner or seams.owner_username(psd_repo)
        name = psd_repo.gitea_name or seams.repo_slug(psd_repo)
        return await client.get_repo(owner, name)

    owner = await ensure_owner(client, psd_repo)
    name = seams.repo_slug(psd_repo)
    priv = private if private is not None else seams.gitea_private(psd_repo)
    desc = (psd_repo.description or "")[:512]

    try:
        if settings.NAMESPACE_MODE == "org":
            data = await client.create_org_repo(
                owner,
                name,
                private=priv,
                default_branch=settings.DEFAULT_BRANCH,
                description=desc,
            )
        else:
            data = await client.create_user_repo(
                owner,
                name,
                private=priv,
                default_branch=settings.DEFAULT_BRANCH,
                description=desc,
            )
    except GiteaError as e:
        if e.status in (409, 422):
            data = await client.get_repo(owner, name)
        else:
            raise

    seams.save_gitea_link(
        psd_repo,
        clone_url=data["clone_url"],
        gitea_repo_id=data["id"],
        gitea_owner=owner,
        gitea_name=name,
        db=db,
    )
    return data


async def mirror_write(
    client: GiteaClient,
    psd_repo,
    files: list[dict],
    *,
    message: str = "Sinkronisasi dari PSD",
) -> dict:
    owner = psd_repo.gitea_owner or seams.owner_username(psd_repo)
    name = psd_repo.gitea_name or seams.repo_slug(psd_repo)
    ops: list[dict] = []
    for f in files:
        path = f["path"]
        content = f.get("content")
        if content is None:
            continue
        op: dict = {"path": path, "content": b64(content)}
        try:
            existing = await client.list_contents(owner, name, path)
            if isinstance(existing, dict) and existing.get("sha"):
                op["operation"] = "update"
                op["sha"] = existing["sha"]
            else:
                op["operation"] = "create"
        except GiteaError as e:
            if e.status == 404:
                op["operation"] = "create"
            else:
                raise
        ops.append(op)
    if not ops:
        return {}
    return await client.change_files(
        owner, name, message=message, files=ops, branch=settings.DEFAULT_BRANCH
    )
