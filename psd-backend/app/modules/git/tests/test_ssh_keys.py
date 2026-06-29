"""Uji validasi kunci SSH."""
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.core.errors import ApiError
from app.gitea.client import GiteaError
from app.modules.git import ssh_keys
from app.modules.git.ssh_keys import normalize_ssh_public_key


def test_normalize_ed25519():
    raw = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI test@example.com"
    assert normalize_ssh_public_key(raw).startswith("ssh-ed25519 ")


def test_reject_private_key_material():
    with pytest.raises(ApiError):
        normalize_ssh_public_key("not-a-key")


@pytest.mark.asyncio
async def test_list_ssh_keys_empty_on_404(monkeypatch):
    user = MagicMock()
    user.username = "budi"
    user.email = "budi@example.com"
    user.name = "Budi"

    client = AsyncMock()
    client.ensure_user = AsyncMock(return_value={"login": "budi"})
    client.list_user_keys = AsyncMock(side_effect=GiteaError(404, "not found"))
    client.aclose = AsyncMock()

    monkeypatch.setattr(ssh_keys, "client_or_none", lambda: client)

    items = await ssh_keys.list_ssh_keys(user)
    assert items == []
    await client.aclose.assert_awaited()


@pytest.mark.asyncio
async def test_list_ssh_keys_uses_gitea_login(monkeypatch):
    user = MagicMock()
    user.username = "Budi.User"
    user.email = "budi@example.com"
    user.name = "Budi"

    client = AsyncMock()
    client.ensure_user = AsyncMock(return_value={"login": "budi-user"})
    client.list_user_keys = AsyncMock(
        return_value=[{"id": 1, "title": "Laptop", "fingerprint": "fp", "key": "ssh-ed25519 AAA"}]
    )
    client.aclose = AsyncMock()

    monkeypatch.setattr(ssh_keys, "client_or_none", lambda: client)

    items = await ssh_keys.list_ssh_keys(user)
    assert items[0]["id"] == 1
    client.list_user_keys.assert_awaited_once_with("budi-user")
