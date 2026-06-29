"""Uji validasi kunci SSH."""
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.core.errors import ApiError
from app.gitea.client import GiteaClient, GiteaError
from app.modules.git import ssh_keys
from app.modules.git.ssh_keys import normalize_ssh_public_key


def test_normalize_ed25519():
    raw = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI test@example.com"
    assert normalize_ssh_public_key(raw).startswith("ssh-ed25519 ")


def test_reject_private_key_material():
    with pytest.raises(ApiError):
        normalize_ssh_public_key("not-a-key")


def test_git_info_payload_custom_ssh_port(monkeypatch):
    user = MagicMock()
    user.username = "budi"

    monkeypatch.setattr(ssh_keys.app_settings, "PSD_GITEA_ENABLED", True)
    monkeypatch.setattr(ssh_keys.app_settings, "PSD_GITEA_ADMIN_TOKEN", "secret")
    monkeypatch.setattr(ssh_keys.app_settings, "PSD_OAUTH_GIT_BASE_URL", "https://git.example.com")
    monkeypatch.setattr(ssh_keys.app_settings, "PSD_GITEA_SSH_PORT", 2222)

    payload = ssh_keys.git_info_payload(user)
    assert payload["ssh_port"] == 2222
    assert payload["ssh_test_command"] == "ssh -p 2222 -T git@git.example.com"
    assert payload["ssh_clone_prefix"] == "ssh://git@git.example.com:2222/budi/"


@pytest.mark.asyncio
async def test_list_user_keys_uses_public_endpoint():
    seen = {}

    def handler(req: httpx.Request):
        seen["path"] = req.url.path
        if req.method == "GET" and req.url.path == "/api/v1/users/budi/keys":
            return httpx.Response(200, json=[])
        return httpx.Response(404)

    client = GiteaClient("http://gitea.local", "token", transport=httpx.MockTransport(handler))
    rows = await client.list_user_keys("budi")
    await client.aclose()
    assert seen["path"] == "/api/v1/users/budi/keys"
    assert rows == []


@pytest.mark.asyncio
async def test_list_ssh_keys_empty_on_404(monkeypatch):
    user = MagicMock()
    user.username = "budi"
    user.email = "budi@example.com"
    user.name = "Budi"

    client = AsyncMock()
    client.list_user_keys = AsyncMock(side_effect=GiteaError(404, "not found"))
    client.aclose = AsyncMock()

    monkeypatch.setattr(ssh_keys, "client_or_none", lambda: client)

    items = await ssh_keys.list_ssh_keys(user)
    assert items == []
    client.list_user_keys.assert_awaited_once_with("budi")
    await client.aclose.assert_awaited()


@pytest.mark.asyncio
async def test_list_ssh_keys_does_not_provision_user(monkeypatch):
    user = MagicMock()
    user.username = "budi"
    user.email = "budi@example.com"
    user.name = "Budi"

    client = AsyncMock()
    client.ensure_user = AsyncMock()
    client.list_user_keys = AsyncMock(
        return_value=[{"id": 1, "title": "Laptop", "fingerprint": "fp", "key": "ssh-ed25519 AAA"}]
    )
    client.aclose = AsyncMock()

    monkeypatch.setattr(ssh_keys, "client_or_none", lambda: client)

    items = await ssh_keys.list_ssh_keys(user)
    assert items[0]["id"] == 1
    client.ensure_user.assert_not_called()
    client.list_user_keys.assert_awaited_once_with("budi")
