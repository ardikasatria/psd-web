"""Registrasi klien internal PSD (Gitea, JupyterHub, Superset)."""
import asyncio
import hashlib
import secrets

from sqlalchemy import select

from app.core.config import settings as app_settings
from app.core.db import SessionLocal
from app.oauth.models import OAuthClient

GIT = app_settings.PSD_OAUTH_GIT_BASE_URL
HUB = app_settings.PSD_OAUTH_HUB_BASE_URL
BI = app_settings.PSD_OAUTH_BI_BASE_URL

CLIENTS = [
    {
        "client_id": "gitea",
        "name": "PSD Git (Gitea)",
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
        "redirect_uris": f"{BI}/oauth-authorized/psd",
        "allowed_scopes": "openid profile email",
    },
]


async def main():
    async with SessionLocal() as db:
        for spec in CLIENTS:
            exists = (
                await db.execute(select(OAuthClient).where(OAuthClient.client_id == spec["client_id"]))
            ).scalar_one_or_none()
            if exists:
                print(f"[skip] {spec['client_id']} sudah ada.")
                continue
            secret = secrets.token_urlsafe(40)
            db.add(
                OAuthClient(
                    client_id=spec["client_id"],
                    client_secret_hash=hashlib.sha256(secret.encode()).hexdigest(),
                    name=spec["name"],
                    redirect_uris=spec["redirect_uris"],
                    allowed_scopes=spec["allowed_scopes"],
                    is_internal=True,
                    is_confidential=True,
                )
            )
            print("=" * 56)
            print(f"client_id     : {spec['client_id']}")
            print(f"client_secret : {secret}   <-- SALIN SEKARANG, tak ditampilkan lagi")
            print(f"redirect_uri  : {spec['redirect_uris']}")
        await db.commit()
    print("=" * 56)
    print("Selesai. Simpan secret di pengelola rahasia, bukan di repo.")


if __name__ == "__main__":
    asyncio.run(main())
