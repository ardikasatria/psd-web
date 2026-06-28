"""
Registrasi klien internal PSD (sub-langkah 1: "registrasi klien internal").

Jalankan SEKALI untuk membuat 3 klien: Gitea, JupyterHub, Superset.
Secret di-print SATU KALI di stdout — salin ke konfigurasi tiap layanan,
JANGAN simpan plaintext di DB (yang tersimpan hanya sha256-nya).

Pemakaian:
    python -m app.oauth.seed_clients

GANTI domain placeholder (psd.example) dengan domain asli Anda.
Sesuaikan get_db agar memakai AsyncSession PSD (lihat dependencies.py).
"""
import asyncio
import hashlib
import secrets

from sqlalchemy import select

from .dependencies import get_db
from .models import OAuthClient

# --- domain placeholder; ganti ke domain produksi Anda ---
GIT = "https://git.psd.example"
HUB = "https://hub.psd.example"
BI = "https://bi.psd.example"

CLIENTS = [
    {
        "client_id": "gitea",
        "name": "PSD Git (Gitea)",
        # Gitea callback: https://<gitea>/user/oauth2/<NamaSumberAuth>/callback
        "redirect_uris": f"{GIT}/user/oauth2/PSD/callback",
        "allowed_scopes": "openid profile email repo:read repo:write",
    },
    {
        "client_id": "jupyterhub",
        "name": "PSD Notebook (JupyterHub)",
        "redirect_uris": f"{HUB}/hub/oauth_callback",
        "allowed_scopes": "openid profile email",
    },
    {
        "client_id": "superset",
        "name": "PSD Analitik (Superset)",
        # FAB: https://<superset>/oauth-authorized/<nama_provider>
        "redirect_uris": f"{BI}/oauth-authorized/psd",
        "allowed_scopes": "openid profile email",
    },
]


async def main():
    async for db in _db_iter():
        for spec in CLIENTS:
            exists = (await db.execute(select(OAuthClient).where(
                OAuthClient.client_id == spec["client_id"]
            ))).scalar_one_or_none()
            if exists:
                print(f"[skip] {spec['client_id']} sudah ada.")
                continue
            secret = secrets.token_urlsafe(40)
            db.add(OAuthClient(
                client_id=spec["client_id"],
                client_secret_hash=hashlib.sha256(secret.encode()).hexdigest(),
                name=spec["name"],
                redirect_uris=spec["redirect_uris"],
                allowed_scopes=spec["allowed_scopes"],
                is_internal=True,        # lewati layar consent
                is_confidential=True,
            ))
            print("=" * 56)
            print(f"client_id     : {spec['client_id']}")
            print(f"client_secret : {secret}   <-- SALIN SEKARANG, tak ditampilkan lagi")
            print(f"redirect_uri  : {spec['redirect_uris']}")
        await db.commit()
    print("=" * 56)
    print("Selesai. Simpan secret di pengelola rahasia, bukan di repo.")


async def _db_iter():
    # get_db adalah async generator; iterasi agar dapat sesi.
    gen = get_db()
    db = await gen.__anext__()
    try:
        yield db
    finally:
        await gen.aclose()


if __name__ == "__main__":
    asyncio.run(main())
