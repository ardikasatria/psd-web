"""Validasi & layanan SSH key Git (Gitea)."""
from __future__ import annotations

import logging
import re
from urllib.parse import urlparse

import httpx

from app.core.config import settings as app_settings
from app.core.errors import ApiError
from app.gitea.client import GiteaClient, GiteaError
from app.gitea.seams import normalize_gitea_username
from app.gitea.service import client_or_none
from app.modules.users.models import User

log = logging.getLogger(__name__)

_SSH_KEY_PREFIXES = (
    "ssh-rsa",
    "ssh-dss",
    "ssh-ed25519",
    "ecdsa-sha2-nistp256",
    "ecdsa-sha2-nistp384",
    "ecdsa-sha2-nistp521",
    "sk-ecdsa-sha2-nistp256@openssh.com",
    "sk-ssh-ed25519@openssh.com",
)


def normalize_ssh_public_key(raw: str) -> str:
    key = " ".join(raw.strip().split())
    if not key:
        raise ApiError(400, "invalid_key", "Kunci SSH publik kosong")
    parts = key.split(" ", 2)
    if len(parts) < 2:
        raise ApiError(400, "invalid_key", "Format kunci SSH tidak valid")
    algo, blob = parts[0], parts[1]
    if algo not in _SSH_KEY_PREFIXES:
        raise ApiError(
            400,
            "invalid_key",
            "Hanya kunci publik OpenSSH yang didukung (ed25519, rsa, ecdsa)",
        )
    if not re.fullmatch(r"[A-Za-z0-9+/]+={0,3}", blob):
        raise ApiError(400, "invalid_key", "Isi kunci SSH tidak valid")
    comment = parts[2] if len(parts) > 2 else ""
    return f"{algo} {blob}" + (f" {comment}" if comment else "")


def gitea_username_for(user: User) -> str:
    return normalize_gitea_username(user.username)


def gitea_email_for(user: User) -> str:
    if user.email:
        return user.email
    login = gitea_username_for(user)
    return f"{login}@{app_settings.PSD_GITEA_EMAIL_DOMAIN}"


def git_public_host() -> str:
    parsed = urlparse(app_settings.PSD_OAUTH_GIT_BASE_URL)
    return parsed.hostname or app_settings.PSD_OAUTH_GIT_BASE_URL.replace("https://", "").split("/")[0]


def git_info_payload(user: User) -> dict:
    host = git_public_host()
    gitea_user = gitea_username_for(user)
    enabled = bool(app_settings.PSD_GITEA_ENABLED and app_settings.PSD_GITEA_ADMIN_TOKEN)
    return {
        "enabled": enabled,
        "git_host": host,
        "git_base_url": app_settings.PSD_OAUTH_GIT_BASE_URL.rstrip("/"),
        "ssh_user": "git",
        "gitea_username": gitea_user,
        "ssh_clone_prefix": f"git@{host}:{gitea_user}/",
        "ssh_test_command": f"ssh -T git@{host}",
    }


def _key_summary(row: dict) -> dict:
    return {
        "id": row["id"],
        "title": row.get("title") or "",
        "fingerprint": row.get("fingerprint") or "",
        "key_type": (row.get("key") or "").split(" ", 1)[0] if row.get("key") else "",
        "created_at": row.get("created_at"),
    }


async def ensure_gitea_user(client: GiteaClient, user: User) -> str:
    login = gitea_username_for(user)
    row = await client.ensure_user(
        username=login,
        email=gitea_email_for(user),
        full_name=user.name or login,
    )
    return str(row.get("login") or login)


def _map_gitea_error(action: str, exc: GiteaError) -> ApiError:
    log.warning("Gitea %s failed: status=%s body=%s", action, exc.status, exc.body[:500])
    if exc.status in (401, 403):
        return ApiError(
            503,
            "git_misconfigured",
            "Integrasi Git PSD belum dikonfigurasi dengan benar (token admin). Hubungi administrator.",
        )
    if exc.status == 404:
        return ApiError(404, "not_found", "Akun Git PSD tidak ditemukan")
    return ApiError(502, "gitea_error", f"Gagal {action} — layanan Git PSD tidak merespons dengan benar")


async def list_ssh_keys(user: User) -> list[dict]:
    client = client_or_none()
    if not client:
        raise ApiError(503, "git_unavailable", "Git PSD belum diaktifkan di server ini")
    try:
        username = await ensure_gitea_user(client, user)
        try:
            rows = await client.list_user_keys(username)
        except GiteaError as e:
            if e.status == 404:
                return []
            raise
        if not rows:
            return []
        return [_key_summary(r) for r in rows if isinstance(r, dict)]
    except ApiError:
        raise
    except GiteaError as e:
        raise _map_gitea_error("memuat kunci SSH", e) from e
    except httpx.HTTPError as e:
        log.exception("Gitea unreachable while listing ssh keys")
        raise ApiError(503, "git_unreachable", "Layanan Git PSD tidak dapat dijangkau saat ini") from e
    finally:
        await client.aclose()


async def add_ssh_key(user: User, *, title: str, key: str) -> dict:
    client = client_or_none()
    if not client:
        raise ApiError(503, "git_unavailable", "Git PSD belum diaktifkan di server ini")
    title_clean = (title or "").strip() or "Laptop PSD"
    if len(title_clean) > 80:
        raise ApiError(400, "invalid_title", "Judul kunci maksimal 80 karakter")
    key_clean = normalize_ssh_public_key(key)
    try:
        username = await ensure_gitea_user(client, user)
        row = await client.add_user_key(username, title=title_clean, key=key_clean)
    except ApiError:
        raise
    except GiteaError as e:
        if e.status in (422, 409):
            raise ApiError(409, "key_exists", "Kunci SSH ini sudah terdaftar") from e
        raise _map_gitea_error("menambahkan kunci SSH", e) from e
    except httpx.HTTPError as e:
        log.exception("Gitea unreachable while adding ssh key")
        raise ApiError(503, "git_unreachable", "Layanan Git PSD tidak dapat dijangkau saat ini") from e
    finally:
        await client.aclose()
    return _key_summary(row)


async def delete_ssh_key(user: User, key_id: int) -> None:
    client = client_or_none()
    if not client:
        raise ApiError(503, "git_unavailable", "Git PSD belum diaktifkan di server ini")
    try:
        username = await ensure_gitea_user(client, user)
        await client.delete_user_key(username, key_id)
    except ApiError:
        raise
    except GiteaError as e:
        if e.status == 404:
            raise ApiError(404, "not_found", "Kunci SSH tidak ditemukan") from e
        raise _map_gitea_error("menghapus kunci SSH", e) from e
    except httpx.HTTPError as e:
        log.exception("Gitea unreachable while deleting ssh key")
        raise ApiError(503, "git_unreachable", "Layanan Git PSD tidak dapat dijangkau saat ini") from e
    finally:
        await client.aclose()
