"""Uji validasi kunci SSH."""
import pytest

from app.core.errors import ApiError
from app.modules.git.ssh_keys import normalize_ssh_public_key


def test_normalize_ed25519():
    raw = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI test@example.com"
    assert normalize_ssh_public_key(raw).startswith("ssh-ed25519 ")


def test_reject_private_key_material():
    with pytest.raises(ApiError):
        normalize_ssh_public_key("not-a-key")
