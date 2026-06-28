"""
Provisioning repo Gitea (sub-langkah 2 & 3 sebagian).

Saat repo PSD dibuat → buat repo padanan di Gitea, simpan clone_url & gitea_repo_id.
Dual-write: tulisan ke PSD juga dicerminkan ke Gitea selama masa transisi.
"""
from __future__ import annotations

from . import seams
from .client import GiteaClient, make_operations
from .settings import settings


async def ensure_owner(client: GiteaClient, psd_repo) -> str:
    """Pastikan namespace pemilik ada di Gitea; kembalikan username/org pemilik."""
    if settings.NAMESPACE_MODE == "org":
        return settings.ORG
    owner = seams.owner_username(psd_repo)
    await client.ensure_user(
        username=owner, email=seams.owner_email(psd_repo),
    )
    return owner


async def provision_repo(client: GiteaClient, psd_repo, *, private: bool = True) -> dict:
    """Buat repo padanan di Gitea & simpan tautannya ke repo PSD."""
    owner = await ensure_owner(client, psd_repo)
    name = seams.repo_slug(psd_repo)
    if settings.NAMESPACE_MODE == "org":
        data = await client.create_org_repo(
            owner, name, private=private, default_branch=settings.DEFAULT_BRANCH)
    else:
        data = await client.create_user_repo(
            owner, name, private=private, default_branch=settings.DEFAULT_BRANCH)
    seams.save_gitea_link(psd_repo, clone_url=data["clone_url"], gitea_repo_id=data["id"])
    return data


async def mirror_write(client: GiteaClient, psd_repo, files: list[dict], *,
                       message: str = "Sinkronisasi dari PSD") -> dict:
    """Dual-write: cerminkan perubahan file PSD ke Gitea sebagai satu commit.

    Catatan: operasi 'update' butuh sha file; untuk dual-write awal yang sederhana,
    gunakan strategi create-or-update sesuai keberadaan file (lihat brief).
    """
    owner = seams.owner_username(psd_repo)
    name = seams.repo_slug(psd_repo)
    ops = make_operations(files, operation="update")
    return await client.change_files(
        owner, name, message=message, files=ops, branch=settings.DEFAULT_BRANCH)
