"""
Migrasi repo lama → Gitea (sub-langkah 4). NON-DESTRUKTIF & bertahap.

Tahapan:
  A. dual-write  : repo baru otomatis dibuat di Gitea (provisioning.provision_repo);
                   files[] PSD tetap source of truth.
  B. backfill    : impor files[] tiap repo lama jadi commit awal (skrip satu kali).
  C. flip        : setelah verifikasi, set source_of_truth='gitea' per repo.

files[] PSD JANGAN dihapus sampai yakin (rollback aman).
"""
from __future__ import annotations

from . import provisioning, seams
from .client import GiteaClient, make_operations
from .settings import settings


async def import_repo(client: GiteaClient, psd_repo, *,
                      message: str = "Impor awal dari PSD") -> dict:
    """Impor files[] lama sebagai satu commit ke repo Gitea padanan.

    Prasyarat: repo Gitea sudah ada (auto_init=True → ada branch default).
    Operasi 'update' menimpa berkas auto-init bila path bertabrakan; untuk path
    baru, pakai 'create'. Di sini dipakai 'create' utk berkas baru; sesuaikan bila
    perlu menimpa README hasil auto_init.
    """
    files = seams.get_legacy_files(psd_repo)
    owner = seams.owner_username(psd_repo)
    name = seams.repo_slug(psd_repo)
    ops = make_operations(files, operation="create")
    return await client.change_files(
        owner, name, message=message, files=ops, branch=settings.DEFAULT_BRANCH)


async def migrate_one(client: GiteaClient, psd_repo, *, flip: bool = False) -> dict:
    """Provision (bila perlu) + impor; opsional flip source of truth."""
    # provision aman dipanggil; bila sudah ada, sesuaikan agar idempoten di seam.
    await provisioning.provision_repo(client, psd_repo)
    result = await import_repo(client, psd_repo)
    if flip:
        seams.set_source_of_truth(psd_repo, "gitea")
    return result


async def backfill_all(client: GiteaClient, *, flip: bool = False) -> dict:
    """Backfill semua repo lama. Kembalikan ringkasan {ok, gagal:[...]}."""
    ok, failed = 0, []
    for psd_repo in seams.iter_legacy_repos():
        try:
            await migrate_one(client, psd_repo, flip=flip)
            ok += 1
        except Exception as e:  # lanjut; catat yang gagal
            failed.append((getattr(psd_repo, "id", "?"), str(e)))
    return {"ok": ok, "failed": failed}
