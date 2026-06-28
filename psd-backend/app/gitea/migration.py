"""Migrasi repo lama → Gitea (non-destruktif)."""
from __future__ import annotations

from app.gitea import provisioning, seams
from app.gitea.client import GiteaClient, make_operations
from app.gitea.settings import settings


async def import_repo(
    client: GiteaClient, psd_repo, *, message: str = "Impor awal dari PSD"
) -> dict:
    files = seams.get_legacy_files(psd_repo)
    owner = psd_repo.gitea_owner or seams.owner_username(psd_repo)
    name = psd_repo.gitea_name or seams.repo_slug(psd_repo)
    if not files:
        return {}
    ops = make_operations(files, operation="create")
    return await client.change_files(
        owner, name, message=message, files=ops, branch=settings.DEFAULT_BRANCH
    )


async def migrate_one(
    client: GiteaClient, psd_repo, *, flip: bool = False, db=None
) -> dict:
    await provisioning.provision_repo(client, psd_repo, db=db)
    result = await import_repo(client, psd_repo)
    if flip:
        seams.set_source_of_truth(psd_repo, "gitea", db=db)
    return result


async def backfill_all(client: GiteaClient, *, flip: bool = False) -> dict:
    ok, failed = 0, []
    for psd_repo in seams.iter_legacy_repos():
        try:
            await migrate_one(client, psd_repo, flip=flip)
            ok += 1
        except Exception as e:
            failed.append((getattr(psd_repo, "id", "?"), str(e)))
    return {"ok": ok, "failed": failed}
