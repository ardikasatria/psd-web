"""Lapisan layanan async untuk router PSD."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.gitea import files_view, provisioning, seams
from app.gitea.client import GiteaClient
from app.gitea.settings import settings as gitea_settings
from app.modules.repos.models import Repo
from app.modules.users.models import User


def client_or_none() -> GiteaClient | None:
    if not gitea_settings.ENABLED or not gitea_settings.ADMIN_TOKEN:
        return None
    return GiteaClient(gitea_settings.BASE_URL, gitea_settings.ADMIN_TOKEN)


def repo_gitea_coords(r: Repo) -> tuple[str, str]:
    owner = r.gitea_owner or seams.owner_username(r)
    name = r.gitea_name or seams.repo_slug(r)
    return owner, name


async def maybe_provision(db: AsyncSession, r: Repo, user: User) -> dict | None:
    client = client_or_none()
    if not client:
        return None
    await db.refresh(r, ["owner"])
    if not r.owner:
        r.owner = user
    async with client:
        data = await provisioning.provision_repo(client, r, db=db)
        await db.commit()
        return data


async def mirror_upload(db: AsyncSession, r: Repo, path: str, content: bytes) -> None:
    if not gitea_settings.ENABLED or not r.gitea_repo_id:
        return
    client = client_or_none()
    if not client:
        return
    async with client:
        await provisioning.mirror_write(
            client,
            r,
            [{"path": path, "content": content}],
            message=f"Tambah/perbarui {path}",
        )


async def list_repo_files(r: Repo, path: str = "", ref: str | None = None) -> list[dict]:
    client = client_or_none()
    if not client or not r.gitea_repo_id:
        return []
    owner, name = repo_gitea_coords(r)
    async with client:
        return await files_view.list_files(client, owner, name, path, ref)


async def repo_diff(r: Repo, base: str, head: str) -> dict:
    client = client_or_none()
    if not client or not r.gitea_repo_id:
        return {"total_commits": 0, "files": []}
    owner, name = repo_gitea_coords(r)
    async with client:
        return await files_view.get_diff(client, owner, name, base, head)


async def flip_source(db: AsyncSession, r: Repo) -> None:
    r.source_of_truth = "gitea"
    await db.commit()
